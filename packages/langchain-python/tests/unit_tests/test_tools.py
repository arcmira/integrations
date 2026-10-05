import asyncio
import json
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from langchain_core.messages import AIMessage, ToolMessage
from langchain_core.tools import ToolException
from langchain_tests.unit_tests.tools import ToolsUnitTests
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode
from pydantic import ValidationError

from langchain_arcmira import ArcmiraResolve, ArcmiraSearch

KEY = "test-arcmira-key-not-real"
SEARCH = json.loads((Path(__file__).parents[1] / "fixtures/search.json").read_text())
RESOLVE = {
    "query": "Alex",
    "confidence": "ambiguous",
    "best": None,
    "suggested": None,
    "ask": {
        "question": "Which Alex?",
        "options": [
            {"id": "ent_1", "name": "Alex One", "type": "person", "label": "Alex One"},
            {"id": "ent_2", "name": "Alex Two", "type": "person", "label": "Alex Two"},
        ],
    },
    "candidates": [],
    "note": "Ask which person the user means.",
}


@pytest.fixture
def network():
    state = {
        "requests": [],
        "clients": [],
        "status": 200,
        "body": SEARCH,
        "error": None,
    }
    sync, asynchronous = httpx.Client, httpx.AsyncClient

    def handle(request):
        state["requests"].append(request)
        if state["error"]:
            raise state["error"]
        return httpx.Response(
            state["status"],
            json=state["body"],
            headers={"Location": "https://other.invalid"},
        )

    def create(cls, **kwargs):
        client = cls(transport=httpx.MockTransport(handle), **kwargs)
        state["clients"].append(client)
        return client

    with (
        patch(
            "langchain_arcmira.tools.httpx.Client",
            side_effect=lambda **kw: create(sync, **kw),
        ),
        patch(
            "langchain_arcmira.tools.httpx.AsyncClient",
            side_effect=lambda **kw: create(asynchronous, **kw),
        ),
    ):
        yield state
    assert all(client.is_closed for client in state["clients"])


class TestSearchStandard(ToolsUnitTests):
    @property
    def tool_constructor(self):
        return ArcmiraSearch

    @property
    def tool_constructor_params(self):
        return {"api_key": KEY}

    @property
    def tool_invoke_params_example(self):
        return {"q": "AI agents", "limit": 5}

    @property
    def init_from_env_params(self):
        return {"ARCMIRA_API_KEY": KEY}, {}, {"api_key": KEY}


class TestResolveStandard(TestSearchStandard):
    @property
    def tool_constructor(self):
        return ArcmiraResolve


def test_search_keeps_evidence_and_sends_all_filters(network):
    params = {
        "q": "AI agents",
        "channel_ids": "UCfixture",
        "channel": "UCanother",
        "entity_ids": "ent_1",
        "about": "ent_2",
        "by": "ent_3",
        "kind": "organic,sponsored",
        "after": "2026-01-01",
        "before": "2026-02-01",
        "source": "arcmira_premium",
        "limit": 2,
    }
    result = ArcmiraSearch(api_key=KEY).invoke(params)
    assert result == SEARCH
    (request,) = network["requests"]
    assert request.url.path == "/v1/search"
    assert dict(request.url.params) == {k: str(v) for k, v in params.items()}
    assert request.headers["authorization"] == "Bearer " + KEY


async def test_async_search_preserves_partial_results(network):
    body = dict(
        SEARCH,
        partial=True,
        failed_batches=2,
        note="Incomplete coverage; do not infer absence.",
    )
    network["body"] = body
    assert await ArcmiraSearch(api_key=KEY).ainvoke({"q": "AI agents"}) == body
    assert len(network["requests"]) == 1


@pytest.mark.parametrize("asynchronous", [False, True])
def test_resolve_keeps_ambiguity(network, asynchronous):
    network["body"] = RESOLVE
    tool = ArcmiraResolve(api_key=KEY)
    args = {"q": "Alex", "type": "person", "context": "a guest", "limit": 3}
    result = asyncio.run(tool.ainvoke(args)) if asynchronous else tool.invoke(args)
    assert result == RESOLVE
    assert network["requests"][0].url.path == "/v1/entities/resolve"
    assert dict(network["requests"][0].url.params) == {
        k: str(v) for k, v in args.items()
    }


@pytest.mark.parametrize(
    "status,code",
    [
        (401, "invalid_api_key"),
        (402, "quota_exceeded"),
        (403, "filter_requires_paid"),
        (429, "rate_limited"),
        (503, "search_unavailable"),
    ],
)
@pytest.mark.parametrize("asynchronous", [False, True])
def test_refusal_is_one_error_with_no_fallback(network, status, code, asynchronous):
    network.update(
        status=status,
        body={
            "error": {
                "code": code,
                "message": "Synthetic refusal " + KEY,
                "type": "permission_error",
                "doc_url": "https://arcmira.com/docs/errors",
                "request_id": "synthetic-request",
            }
        },
    )
    tool = ArcmiraSearch(api_key=KEY)
    args = {"q": "AI agents", "source": "arcmira_premium"}
    with pytest.raises(ToolException, match=code) as error:
        if asynchronous:
            asyncio.run(tool.ainvoke(args))
        else:
            tool.invoke(args)
    assert KEY not in str(error.value)
    assert len(network["requests"]) == 1
    assert network["requests"][0].url.params["source"] == "arcmira_premium"


@pytest.mark.parametrize("error", [httpx.ReadTimeout(KEY), httpx.ConnectError(KEY)])
async def test_transport_error_is_sanitized_and_not_retried(network, error):
    network["error"] = error
    with pytest.raises(ToolException, match="no automatic retry") as caught:
        await ArcmiraSearch(api_key=KEY).ainvoke({"q": "AI agents"})
    assert KEY not in str(caught.value)
    assert len(network["requests"]) == 1


def test_redirect_never_forwards_key(network):
    network["status"] = 302
    with pytest.raises(ToolException, match="302"):
        ArcmiraSearch(api_key=KEY).invoke({"q": "AI agents"})
    assert len(network["requests"]) == 1


@pytest.mark.parametrize(
    "args",
    [
        {"q": ""},
        {"q": "AI", "limit": 0},
        {"q": "AI", "limit": 21},
        {"q": "AI", "limit": True},
        {"q": "AI", "limit": 1.5},
        {"q": "AI", "url": "https://other.invalid"},
        {"q": "AI", "api_key": "override"},
        {"q": "AI", "source": "automatic"},
    ],
)
def test_bad_inputs_rejected_before_network(network, args):
    with pytest.raises(ValidationError):
        ArcmiraSearch(api_key=KEY).invoke(args)
    assert not network["requests"]


def test_key_is_not_in_model_schema_or_serialized_tool(network):
    tool = ArcmiraSearch(api_key=KEY)
    assert "api_key" not in tool.tool_call_schema.model_json_schema()["properties"]
    assert KEY not in repr(tool)
    assert "api_key" not in tool.model_dump()
    assert KEY not in json.dumps(tool.to_json())
    with pytest.raises(ValidationError):
        ArcmiraSearch(api_key="")
    assert not network["requests"]


def test_langgraph_tool_node_preserves_call_id_and_evidence(network):
    builder = StateGraph(MessagesState)
    builder.add_node(
        "tools", ToolNode([ArcmiraSearch(api_key=KEY), ArcmiraResolve(api_key=KEY)])
    )
    builder.add_edge(START, "tools")
    builder.add_edge("tools", END)
    graph = builder.compile()
    result = graph.invoke(
        {
            "messages": [
                AIMessage(
                    content="",
                    tool_calls=[
                        {
                            "id": "research-1",
                            "name": "arcmira_search",
                            "args": {"q": "AI agents"},
                        }
                    ],
                )
            ]
        }
    )
    message = result["messages"][-1]
    assert isinstance(message, ToolMessage)
    assert message.tool_call_id == "research-1"
    assert json.loads(message.content) == SEARCH


async def test_cancelled_async_request_stops(network):
    network["error"] = asyncio.CancelledError()
    with pytest.raises(asyncio.CancelledError):
        await ArcmiraSearch(api_key=KEY).ainvoke({"q": "AI agents"})
    assert len(network["requests"]) == 1


def test_malformed_api_response_does_not_expose_raw_body(network):
    network.update(status=401, body={"error": KEY})
    with pytest.raises(ToolException, match="unexpected response") as error:
        ArcmiraSearch(api_key=KEY).invoke({"q": "AI agents"})
    assert KEY not in str(error.value)
    assert len(network["requests"]) == 1
