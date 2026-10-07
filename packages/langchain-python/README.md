# Arcmira: YouTube Transcript Search for LangChain

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

Give your agent timestamped evidence from YouTube videos and livestreams. Find who said what, search mentions of people and products, and filter passages classified as sponsored or organic.

Install the published PyPI package below. Arcmira is listed in the [LangChain provider directory](https://docs.langchain.com/oss/python/integrations/providers/all_providers) and [tools catalog](https://docs.langchain.com/oss/python/integrations/tools). See [release status](https://github.com/arcmira/integrations/blob/master/RELEASE.md) for verification details.

## Quick start

```sh
pip install langchain-arcmira==0.1.0
export ARCMIRA_API_KEY='your-key'
python - <<'PY'
from langchain_arcmira import ArcmiraSearch

result = ArcmiraSearch().invoke({"q": "AI agents", "limit": 5})
for chunk in result["chunks"]:
    print(chunk["text"])
    print(chunk["watch_url"])
print(result["note"])
PY
```

Keep the API key in server-side configuration. It is excluded from model tool arguments and serialized tool configuration. Relative `watch_url` values resolve against `https://arcmira.com`.

## Tools

| Tool | Purpose |
| --- | --- |
| `ArcmiraSearch` | Search transcript passages with timestamps, source labels, speaker and entity filters, dates, and sponsored or organic classifications. |
| `ArcmiraResolve` | Resolve a person, organization, product, topic or channel before using its IDs in a search. |

Both are native LangChain `BaseTool` classes. Pass them to a LangChain agent or LangGraph `ToolNode`. For the LangGraph example, also install `langgraph`:

```python
from langgraph.prebuilt import ToolNode
from langchain_arcmira import ArcmiraResolve, ArcmiraSearch

tools = [ArcmiraSearch(), ArcmiraResolve()]
research = ToolNode(tools)
```

Async callers use `await tool.ainvoke({...})`. Requests use an async HTTP client and propagate cancellation. The default timeout is 30 seconds; configure it with `ArcmiraSearch(timeout=60)`.

## Search precisely

Resolve one name at a time with `ArcmiraResolve().invoke({"q": "Google", "type": "organization"})`. Preserve the result's distinction between `best`, `suggested` and `ask`. A suggested match is an assumption to disclose. An ambiguous result needs clarification or separate research for each candidate.

Search takes IDs, not names:

- `channel_ids` scopes YouTube channels. Use a resolved channel's `youtube_channel_id`.
- `entity_ids` scopes entity appearances. `about` finds passages mentioning an entity. `by` finds words attributed to a person.
- `kind` accepts comma-separated `sponsored`, `organic` and `mention` classifications.
- `after` is inclusive and `before` is exclusive. Both accept publication dates or ISO 8601 datetimes.
- `source` selects `arcmira_premium`, `creator_captions` or `third_party_quick`.
- `limit` is 1–20, default 5. Entity resolution accepts a limit of 1–15.

Results preserve the API envelope, including coverage notes, partial-result indicators, ambiguity and access details. An empty result describes the indexed coverage, not everything said on YouTube. Speaker labels and account access vary.

## Usage and failures

A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. Search uses four credits per returned passage beyond the first five. Entity resolution uses no credits. Account access and freshness limits still apply.

A refused Premium filter remains an error. The tools do not substitute captions, widen date filters or turn failures into empty results. They raise LangChain `ToolException` for API and connection errors. Requests are not automatically retried. Malformed API responses produce a sanitized error.

These two tools do not fetch full transcripts or write monitors. Use the [SDK](https://arcmira.com/docs/libraries) or [MCP server](https://arcmira.com/docs/mcp-server) for those operations.

## Develop and verify locally

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/packages/langchain-python
uv sync --frozen
uv run --frozen ruff check .
uv run --frozen pytest tests/unit_tests -q
# Optional, with your own API key. Searches return at most one passage per call.
uv run --frozen pytest tests/integration_tests -q
uv build
uv run --frozen twine check dist/*
```

The locked development environment uses Arcmira SDK 0.4.3, LangChain Core 1.6.5, LangChain Tests 1.1.9 and LangGraph 1.2.12. Third-party dependencies have a September 28, 2026 release cutoff. The first-party SDK uses its released PyPI wheel.

[Report an issue](https://github.com/arcmira/integrations/issues) with package versions, the API error code or request ID, and a small reproduction. Never include your API key or private account data.
