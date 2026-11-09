import asyncio
import json
from pathlib import Path
from unittest.mock import patch

import httpx
import pytest
from pydantic import ValidationError

from strands_arcmira import arcmira_resolve, arcmira_search

KEY = "synthetic-test-key"
SEARCH = json.loads((Path(__file__).parent / "fixtures/search.json").read_text())
RESOLVE = {
    "query": "Alex",
    "confidence": "ambiguous",
    "best": None,
    "suggested": None,
    "candidates": [],
    "ask": {
        "question": "Which Alex?",
        "options": [
            {"id": "ent_1", "name": "Alex One", "type": "person", "label": "Alex One"},
            {"id": "ent_2", "name": "Alex Two", "type": "person", "label": "Alex Two"},
        ],
    },
    "note": "Ask which person the user means.",
}


@pytest.fixture
def network(monkeypatch):
    monkeypatch.setenv("ARCMIRA_API_KEY", KEY)
    state = {
        "requests": [],
        "clients": [],
        "status": 200,
        "body": SEARCH,
        "error": None,
    }
    client_class = httpx.Client

    def handle(request):
        state["requests"].append(request)
        if state["error"]:
            raise state["error"]
        return httpx.Response(
            state["status"],
            json=state["body"],
            headers={"Location": "https://elsewhere.invalid"},
        )

    def create(**kwargs):
        client = client_class(transport=httpx.MockTransport(handle), **kwargs)
        state["clients"].append(client)
        return client

    with patch("strands_arcmira.tools.httpx.Client", side_effect=create):
        yield state
    assert all(client.is_closed for client in state["clients"])


def invoke_native(tool, **parameters):
    async def collect():
        return [
            event
            async for event in tool.stream(
                {"toolUseId": "test-call", "name": tool.tool_name, "input": parameters},
                {"agent": object()},
            )
        ]

    return asyncio.run(collect())[-1]["tool_result"]


def test_search_preserves_quotes_and_filters(network):
    params = dict(
        q="AI video",
        by="ent_1",
        about="ent_2",
        kind="organic,sponsored",
        after="2026-01-01",
        before="2026-02-01",
        limit=5,
    )
    assert arcmira_search(**params) == SEARCH
    (request,) = network["requests"]
    assert str(request.url).startswith("https://api.arcmira.com/v1/search?")
    assert request.method == "GET"
    assert dict(request.url.params) == {k: str(v) for k, v in params.items()}
    assert request.headers["authorization"] == "Bearer " + KEY


def test_resolve_preserves_ambiguity(network):
    network["body"] = RESOLVE
    params = dict(q="Alex", type="person", context="podcast guest", limit=3)
    assert arcmira_resolve(**params) == RESOLVE
    (request,) = network["requests"]
    assert request.url.path == "/v1/entities/resolve"
    assert dict(request.url.params) == {k: str(v) for k, v in params.items()}


def test_native_strands_success(network):
    result = invoke_native(arcmira_search, q="AI video")
    assert result["status"] == "success"
    assert result["toolUseId"] == "test-call"
    assert json.loads(result["content"][0]["text"]) == SEARCH
    assert network["requests"][0].url.params["limit"] == "5"


def test_missing_key_never_connects(network, monkeypatch):
    monkeypatch.delenv("ARCMIRA_API_KEY")
    result = invoke_native(arcmira_search, q="AI video")
    assert result["status"] == "error"
    assert "Set ARCMIRA_API_KEY" in result["content"][0]["text"]
    assert network["requests"] == []


@pytest.mark.parametrize(
    "parameters",
    [
        dict(q="a"),
        dict(q="AI", limit=0),
        dict(q="AI", limit=21),
        dict(q="AI", limit=True),
    ],
)
def test_native_invalid_input_never_connects(network, parameters):
    assert invoke_native(arcmira_search, **parameters)["status"] == "error"
    assert network["requests"] == []


def test_direct_input_validation(network):
    with pytest.raises(ValidationError):
        arcmira_resolve(q="Alex", limit=16)
    assert not network["requests"]


@pytest.mark.parametrize(
    "status,code",
    [
        (400, "id_required"),
        (401, "unauthorized"),
        (402, "insufficient_credits"),
        (429, "rate_limited"),
    ],
)
def test_native_refusals_preserved_without_retry(network, status, code):
    network.update(
        status=status,
        body={
            "error": {
                "type": {
                    400: "invalid_request_error",
                    401: "authentication_error",
                    402: "quota_exceeded",
                    429: "rate_limit_error",
                }[status],
                "code": code,
                "message": code,
                "doc_url": "https://arcmira.com/docs",
                "request_id": "test-request",
            }
        },
    )
    result = invoke_native(arcmira_search, q="AI video", by="Alex")
    assert result["status"] == "error"
    assert code in result["content"][0]["text"]
    assert len(network["requests"]) == 1
    assert network["requests"][0].url.params["by"] == "Alex"


def test_redirect_not_followed(network):
    network.update(status=302, body={"error": "redirect"})
    assert invoke_native(arcmira_search, q="AI video")["status"] == "error"
    assert len(network["requests"]) == 1


@pytest.mark.parametrize(
    "error", [httpx.ReadTimeout("timeout"), httpx.ConnectError("cannot connect")]
)
def test_transport_failure_no_retry(network, error):
    network["error"] = error
    result = invoke_native(arcmira_search, q="AI video")
    assert result["status"] == "error"
    assert "no automatic retry" in result["content"][0]["text"]
    assert len(network["requests"]) == 1


def test_error_redacts_key(network):
    network.update(
        status=401,
        body={
            "error": {
                "type": "authentication_error",
                "code": "invalid_api_key",
                "message": KEY,
                "doc_url": "https://arcmira.com/docs",
                "request_id": "test-request",
            }
        },
    )
    result = invoke_native(arcmira_search, q="AI video")
    assert KEY not in json.dumps(result)
    assert "[redacted]" in json.dumps(result)


def test_schemas_have_bounds_and_no_credentials():
    for tool in (arcmira_search, arcmira_resolve):
        schema = tool.tool_spec["inputSchema"]["json"]
        assert schema["additionalProperties"] is False
        assert schema["required"] == ["q"]
        assert schema["properties"]["q"]["minLength"] == 2
        assert "key" not in json.dumps(schema).lower()
    assert (
        arcmira_search.tool_spec["inputSchema"]["json"]["properties"]["limit"][
            "maximum"
        ]
        == 20
    )
    assert (
        arcmira_resolve.tool_spec["inputSchema"]["json"]["properties"]["limit"][
            "maximum"
        ]
        == 15
    )


def test_partial_results_not_upgraded_to_complete(network):
    network["body"] = dict(SEARCH, partial=True, note="Incomplete coverage.")
    assert arcmira_search(q="AI video") == network["body"]


def test_agent_registration_and_dispatch(network):
    from unittest.mock import Mock

    from strands import Agent
    from strands.models import Model

    model = Mock(spec=Model)
    model.config = {}
    model.get_config.return_value = {}
    agent = Agent(
        model=model, tools=[arcmira_search, arcmira_resolve], callback_handler=None
    )
    assert set(agent.tool_registry.registry) == {"arcmira_search", "arcmira_resolve"}
    result = agent.tool.arcmira_search(q="AI video", limit=5)
    assert result["status"] == "success"
    assert json.loads(result["content"][0]["text"]) == SEARCH
    model.stream.assert_not_called()


def test_native_rejects_unknown_input(network):
    result = invoke_native(arcmira_search, q="AI video", api_key="override")
    assert result["status"] == "error"
    assert network["requests"] == []
