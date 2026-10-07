# Arcmira: YouTube Transcript Search for Langflow

[Arcmira](https://arcmira.com) · [API documentation](https://arcmira.com/docs) · [API schema](https://api.arcmira.com/v1/openapi.json)

An opt-in Python extension preview with two native Langflow components:

- **YouTube Transcript Search:** find timestamped passages, retaining source links, coverage and access metadata.
- **Entity Resolve:** resolve names and handles without silently choosing among ambiguous candidates.

A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. The configured budget is the approval. API plan limits and refusals remain visible. Selecting Premium never triggers a caption fallback. This extension makes one API request per component execution; it does not retry automatically.

## Local installation

This package is not published to PyPI or included in Langflow. With a compatible Langflow/LFX installation, install this source preview in the same environment:

```sh
python -m pip install "git+https://github.com/arcmira/integrations.git#subdirectory=packages/langflow"
lfx extension list
```

It registers through the official `langflow.extensions` entry point. Restart Langflow after installation. Add an Arcmira API key to the component's secret field. Search by IDs after resolving names; inspect candidates and clarification before choosing an entity. The query input supports native tool mode. No model is required to call a component's output directly.

Both components return the complete API JSON envelope in `Data`. A non-success HTTP response raises `ArcmiraReadError` with `status`, `body` and selected response `headers`; the error message retains the refusal body and redacts echoes of the supplied key. Visual editor presentation of these exceptions remains unverified.

## Validation status

The candidate targets mature LFX 1.12.3 (September 22, 2026). Local HTTP fixtures use real HTTPX transport and prohibit socket connections; no real API key or paid call is involved. Released LFX manifest/AST validation and package build are recorded separately from full component import, native tool execution and frontend testing. The isolated LFX 1.12.3 runtime passes extension import validation, installed-extension discovery, four native component/tool checks and eleven HTTP fixture tests. Native tool output preserves the complete response as an artifact. Visual editor presentation and live-account reads remain unverified.

```sh
uv sync --frozen
uv run --frozen python -m unittest discover -s tests -v
uv run --frozen lfx extension validate . --execute-imports
uv run --frozen lfx extension list --format json
uv build
```

The upstream integration proposal is [Langflow issue 15539](https://github.com/langflow-ai/langflow/issues/15539). An open proposal is not a catalog listing or maintainer approval.
