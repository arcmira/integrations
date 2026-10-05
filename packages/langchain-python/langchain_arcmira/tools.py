"""Native LangChain tools backed by the released Arcmira SDK."""

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any, ClassVar, Literal

import httpx
from arcmira import Arcmira, AsyncArcmira
from arcmira.core.api_error import ApiError
from arcmira.core.parse_error import ParsingError
from langchain_core.tools import BaseTool, ToolException
from langchain_core.utils import secret_from_env
from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class SearchInput(BaseModel):
    """Search one topic across indexed transcript passages."""

    model_config = ConfigDict(extra="forbid")
    q: str = Field(min_length=2, description="One topic or phrase per call.")
    channel_ids: str | None = Field(
        default=None,
        description="Up to 8 comma-separated YouTube channel IDs. Resolve names first.",
    )
    channel: str | None = Field(
        default=None, description="Alias of channel_ids; both scopes are combined."
    )
    entity_ids: str | None = Field(
        default=None,
        description="Up to 8 entity IDs, comma-separated. A person scopes appearances.",
    )
    about: str | None = Field(
        default=None,
        description="Comma-separated entity IDs mentioned in the passages, up to 8.",
    )
    by: str | None = Field(
        default=None,
        description="Up to 8 person IDs speaking the words. Speaker coverage varies.",
    )
    kind: str | None = Field(
        default=None,
        description="Comma-separated sponsored, organic or mention classes.",
    )
    after: str | None = Field(
        default=None,
        description="Inclusive publication date or datetime. Access gates apply.",
    )
    before: str | None = Field(
        default=None, description="Exclusive publication date or ISO 8601 datetime."
    )
    source: (
        Literal["arcmira_premium", "creator_captions", "third_party_quick"] | None
    ) = Field(
        default=None,
        description="Transcript source. Never fall back after a Premium refusal.",
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=20,
        strict=True,
        description="Passages to return. Results beyond the first 5 use credits.",
    )


class ResolveInput(BaseModel):
    """Resolve an entity before using its ID in search filters."""

    model_config = ConfigDict(extra="forbid")
    q: str = Field(
        min_length=1, description="One name, handle, YouTube URL or channel ID."
    )
    type: Literal["person", "organization", "product", "topic", "channel"] | None = None
    context: str | None = Field(
        default=None, description="The user's own words describing the intended entity."
    )
    limit: int = Field(default=8, ge=1, le=15, strict=True)


class _ArcmiraTool(BaseTool):
    api_key: SecretStr = Field(
        default_factory=secret_from_env("ARCMIRA_API_KEY"),
        exclude=True,
        validate_default=True,
    )
    timeout: float = Field(default=30, gt=0)
    _operation: ClassVar[Literal["search", "resolve"]]

    @field_validator("api_key")
    @classmethod
    def nonempty_key(cls, value: SecretStr) -> SecretStr:
        if not value.get_secret_value().strip():
            raise ValueError("Set an Arcmira API key in server-side configuration.")
        return value

    @contextmanager
    def _errors(self) -> Iterator[None]:
        try:
            yield
        except ApiError as error:
            text = str(error).replace(self.api_key.get_secret_value(), "[redacted]")
            raise ToolException(f"Arcmira API error: {text}") from None
        except ParsingError:
            raise ToolException(
                "Arcmira returned an unexpected response; no result was inferred."
            ) from None
        except httpx.TimeoutException:
            raise ToolException(
                "Arcmira request timed out; no automatic retry was made."
            ) from None
        except httpx.RequestError:
            raise ToolException(
                "Arcmira connection failed; no automatic retry was made."
            ) from None

    def _run(self, **kwargs: Any) -> dict[str, Any]:
        with (
            self._errors(),
            httpx.Client(timeout=self.timeout, follow_redirects=False) as http,
        ):
            client = Arcmira(
                api_key=self.api_key.get_secret_value(),
                httpx_client=http,
                max_retries=0,
            )
            result = (
                client.transcripts.search(**kwargs)
                if self._operation == "search"
                else client.entities.resolve(**kwargs)
            )
            return result.model_dump(mode="json", by_alias=True, exclude_unset=True)

    async def _arun(self, **kwargs: Any) -> dict[str, Any]:
        with self._errors():
            async with httpx.AsyncClient(
                timeout=self.timeout, follow_redirects=False
            ) as http:
                client = AsyncArcmira(
                    api_key=self.api_key.get_secret_value(),
                    httpx_client=http,
                    max_retries=0,
                )
                result = (
                    await client.transcripts.search(**kwargs)
                    if self._operation == "search"
                    else await client.entities.resolve(**kwargs)
                )
                return result.model_dump(mode="json", by_alias=True, exclude_unset=True)


class ArcmiraSearch(_ArcmiraTool):
    """Search timestamped YouTube passages with sync and async support."""

    name: str = "arcmira_search"
    description: str = (
        "Search indexed YouTube passages for one topic. Resolve names first. "
        "Use by for labeled speakers, about for mentions, and kind for "
        "sponsored or organic passages. "
        "Preserve timestamps, source labels, coverage notes and access errors. "
        "Resolve relative watch_url links against https://arcmira.com. "
        "An empty result is not proof something was never discussed. "
        "A paid read uses credits from your plan, then your on-demand budget."
    )
    args_schema: type[BaseModel] = SearchInput
    _operation: ClassVar[Literal["search", "resolve"]] = "search"


class ArcmiraResolve(_ArcmiraTool):
    """Resolve a person, organization, product, topic or channel without guessing."""

    name: str = "arcmira_resolve"
    description: str = (
        "Resolve one name before using search filters. best is a confident match; "
        "suggested is an assumption to disclose; ask contains options to "
        "clarify or research separately. "
        "For channels use youtube_channel_id; for other entities use id. "
        "Preserve candidates, evidence and ambiguity. Resolution uses no credits."
    )
    args_schema: type[BaseModel] = ResolveInput
    _operation: ClassVar[Literal["search", "resolve"]] = "resolve"
