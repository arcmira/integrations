"""Native Strands tools backed by the released Arcmira SDK."""

import os
from typing import Any, Literal

import httpx
from arcmira import Arcmira
from arcmira.core.api_error import ApiError
from arcmira.core.parse_error import ParsingError
from pydantic import BaseModel, ConfigDict, Field, StrictInt
from strands import tool
from strands.types.tools import ToolContext

from ._copy import SEARCH_DESCRIPTION


class SearchInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    q: str = Field(
        min_length=2, description="One topic or phrase, at least 2 characters."
    )
    by: str | None = Field(None, description="Person ids whose own words to return.")
    about: str | None = Field(
        None, description="Entity ids the passages must be about."
    )
    kind: str | None = Field(None, description="sponsored, organic or mention.")
    after: str | None = Field(None, description="Publication date bounds, ISO 8601.")
    before: str | None = Field(None, description="Publication date bounds, ISO 8601.")
    limit: StrictInt = Field(
        5,
        ge=1,
        le=20,
        description=(
            "1 to 20 passages. The first 5 use no credits; each one past 5 uses 4."
        ),
    )


class ResolveInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    q: str = Field(
        min_length=2, description="One name, handle, YouTube URL or channel ID."
    )
    type: Literal["person", "organization", "product", "topic", "channel"] | None = None
    context: str | None = Field(None, min_length=2, max_length=300)
    limit: StrictInt = Field(8, ge=1, le=15)


def _request(
    operation: Literal["search", "resolve"], params: BaseModel
) -> dict[str, Any]:
    key = os.environ.get("ARCMIRA_API_KEY", "").strip()
    if not key:
        raise ValueError(
            "Set ARCMIRA_API_KEY. Get a free account at https://arcmira.com."
        )
    try:
        with httpx.Client(timeout=30, follow_redirects=False) as http:
            client = Arcmira(api_key=key, httpx_client=http, max_retries=0)
            arguments = params.model_dump(exclude_none=True)
            result = (
                client.transcripts.search(**arguments)
                if operation == "search"
                else client.entities.resolve(**arguments)
            )
            return result.model_dump(mode="json", by_alias=True, exclude_unset=True)
    except ApiError as error:
        detail = str(error).replace(key, "[redacted]")
        raise RuntimeError(f"Arcmira API error: {detail}") from None
    except ParsingError:
        raise RuntimeError(
            "Arcmira returned an unexpected response; no result was inferred."
        ) from None
    except httpx.TimeoutException:
        raise RuntimeError(
            "Arcmira request timed out; no automatic retry was made."
        ) from None
    except httpx.RequestError:
        raise RuntimeError(
            "Arcmira connection failed; no automatic retry was made."
        ) from None


@tool(
    context=True,
    description=SEARCH_DESCRIPTION,
    inputSchema={"json": SearchInput.model_json_schema()},
)
def arcmira_search(
    q: str,
    by: str | None = None,
    about: str | None = None,
    kind: str | None = None,
    after: str | None = None,
    before: str | None = None,
    limit: StrictInt = 5,
    tool_context: ToolContext | None = None,
) -> dict[str, Any]:
    """Search indexed YouTube transcript passages, preserving source evidence."""
    if tool_context is not None:
        return _request(
            "search", SearchInput.model_validate(tool_context.tool_use["input"])
        )
    return _request(
        "search",
        SearchInput(
            q=q,
            by=by,
            about=about,
            kind=kind,
            after=after,
            before=before,
            limit=limit,
        ),
    )


@tool(context=True, inputSchema={"json": ResolveInput.model_json_schema()})
def arcmira_resolve(
    q: str,
    type: Literal["person", "organization", "product", "topic", "channel"]
    | None = None,
    context: str | None = None,
    limit: StrictInt = 8,
    tool_context: ToolContext | None = None,
) -> dict[str, Any]:
    """Resolve a name to an entity ID before filtering search. Preserve ambiguity."""
    if tool_context is not None:
        return _request(
            "resolve", ResolveInput.model_validate(tool_context.tool_use["input"])
        )
    return _request(
        "resolve", ResolveInput(q=q, type=type, context=context, limit=limit)
    )
