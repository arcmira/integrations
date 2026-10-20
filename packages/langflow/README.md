# Arcmira: YouTube Transcript Search for Langflow

[Arcmira](https://arcmira.com) · [API documentation](https://arcmira.com/docs) · [API schema](https://api.arcmira.com/v1/openapi.json)

An opt-in Python extension with two native Langflow components:

- **YouTube Transcript Search:** find timestamped passages, retaining source links, coverage and access metadata.
- **Entity Resolve:** resolve names and handles without silently choosing among ambiguous candidates.

A paid read uses credits from your plan, then your on-demand budget. Arcmira enforces the budget set in your dashboard, so no call takes a spending amount. API plan limits and refusals remain visible. Selecting Premium never triggers a caption fallback. This extension makes one API request per component execution; it does not retry automatically.

## Local installation

This extension is installed separately from Langflow. With a compatible Langflow/LFX installation, install it in the same environment:

```sh
python -m pip install lfx-arcmira==0.1.0
lfx extension list
```

It registers through the official `langflow.extensions` entry point. Restart Langflow after installation. In **Components**, expand **Arcmira** and use the add button beside either component. Add an Arcmira API key to the component's secret field. Search by IDs after resolving names; inspect candidates and clarification before choosing an entity. The query input supports native tool mode. No model is required to call a component's output directly.

Both components return the complete API JSON envelope in `Data`. A non-success HTTP response raises `ArcmiraReadError` with `status`, `body` and selected response `headers`; the error message retains the refusal body and redacts echoes of the supplied key. The Langflow 1.12.3 editor displays the API error body, including its error code and request ID.

## Validation status

The extension targets LFX 1.12.3 (September 22, 2026). Local HTTP fixtures use real HTTPX transport and prohibit socket connections; no real API key or paid call is involved. Released LFX manifest/AST validation and package build are recorded separately from full component import, native tool execution and frontend testing. The isolated LFX 1.12.3 runtime passes extension import validation, installed-extension discovery, four native component/tool checks and eleven HTTP fixture tests. Native tool output preserves the complete response as an artifact.

A fresh PyPI installation of version 0.1.0 was checked in the Langflow 1.12.3 editor on October 11, 2026. Both components appear under **Components > Arcmira** and can be added to the canvas. The editor displays the metered-usage description, masks API-key inputs, and rejects an Entity Resolve run with missing required fields. On October 20, the installed components returned one live transcript-search result and one resolved entity through their Python output methods. The first search returned HTTP 503 `search_unavailable`; one explicit retry succeeded. The editor separately displayed HTTP 401 `invalid_api_key` from a synthetic invalid key. No model or Premium transcript was used, and recorded credit usage did not change. Successful authenticated execution through the editor remains unverified.

```sh
uv sync --frozen
uv run --frozen python -m unittest discover -s tests -v
uv run --frozen lfx extension validate . --execute-imports
uv run --frozen lfx extension list --format json
uv build
```

The upstream integration proposal is [Langflow issue 15539](https://github.com/langflow-ai/langflow/issues/15539). An open proposal is not a catalog listing or maintainer approval.
