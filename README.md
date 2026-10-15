# Arcmira: YouTube Transcript Search Integrations

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Usage and billing](https://arcmira.com/docs/usage-and-billing) · [MCP and agent skills](https://github.com/arcmira/mcp) · [YouTube](https://www.youtube.com/@arcmira)

Add YouTube transcript search to your agents and workflows. LangChain, AI SDK, n8n and Dify also resolve people, organizations, products, topics and channels. Results retain timestamped source links and coverage notes.

| Integration | Source | Status |
| --- | --- | --- |
| Nix CLI | [Package and installation](nix) | First-party source package; CLI 0.5.1 |
| Homebrew CLI | [Formula and installation](Formula) | First-party tap; CLI 0.6.0 |
| LangChain / LangGraph, TypeScript | [Setup and tools](packages/langchain) | [npm 0.1.0](https://www.npmjs.com/package/@arcmira/langchain); catalog update requested |
| LangChain / LangGraph, Python | [Setup and tools](packages/langchain-python) | [PyPI 0.1.6](https://pypi.org/project/langchain-arcmira/0.1.6/); [LangChain catalog](https://docs.langchain.com/oss/python/integrations/providers/all_providers) |
| Langflow | [Setup and components](packages/langflow) | [PyPI 0.1.0](https://pypi.org/project/lfx-arcmira/0.1.0/); native runtime and editor fields verified; live-account checks and catalog review pending |
| Vercel AI SDK | [Setup guide](https://arcmira.github.io/integrations/ai-sdk/) · [Source](packages/ai-sdk) | [npm 0.1.0](https://www.npmjs.com/package/@arcmira/ai-sdk); catalog review pending |
| Activepieces | [Setup and action](packages/activepieces) | [npm 0.1.0](https://www.npmjs.com/package/@arcmira/piece-arcmira); native editor verified; manual installation available |
| n8n | [Setup and node](packages/n8n) | Source preview; native editor search and entity resolution verified. npm publication and n8n review pending |
| n8n CSV workflow | [YouTube clip shortlist](examples/n8n-clip-shortlist) | Native n8n 2.41.3 fixture and live CSV export verified; importable example |
| n8n built-in workflow | [Transcript source shortlist](examples/n8n-source-shortlist) | One bounded Free-account execution verified; importable example, not a catalog listing |
| Node-RED built-in flow | [Transcript source shortlist CSV](examples/node-red-source-shortlist) | Native fixture checks and one bounded Free-account execution passed; importable example, not a catalog listing |
| dlt REST to local files | [Bounded search and channel snapshots](examples/dlt) | Local fixture tests and one live Free-account search export passed; no dlt catalog listing |
| Meltano / Singer | [Scoped mentions and recommendations](packages/meltano) | Source preview with native DuckDB fixture checks; authenticated export and Hub publication pending |
| Airbyte | [Scoped source and validation](packages/airbyte) | Local Airbyte 2.3.0 fixture checks and one live channel-video export passed; broader live validation and catalog acceptance pending |
| Pipedream Connect / MCP | [Native actions and validation](packages/pipedream) | Locally tested source preview; app registration and hosted validation pending |
| Dify | [Setup and plugin](packages/dify) | Plugin 0.1.2 passed native Community Edition research; Cloud workflow validation and Marketplace review pending |
| Appmixer | [Setup and connector](packages/appmixer) | [Connector 1.0.5](https://github.com/arcmira/integrations/releases/tag/appmixer-v1.0.5) published; 1.0.4 installed privately with native entity resolution verified; public catalog acceptance pending |

For DSH, the [API documentation preset](examples/dsh) searches documentation without an API key. Its native session check passes; it does not provide YouTube research.

For Mastra, the [API documentation guide](https://arcmira.com/docs/documentation-mcp) includes a tested keyless example in the Mastra tab. It searches API documentation; authenticated YouTube research is separate.

For a standard MCP connection, use the authenticated [OpenAI Agents SDK](examples/openai-agents) or [Pydantic AI](examples/pydantic-ai) research example. Both retrieve a timestamped passage without an external model call.

For creators, the [reel workflow note](examples/reel-workflow) follows source discovery, human selection and a local JavaScript Canvas/ffmpeg edit. The [Remotion quote-card example](examples/remotion-quote-cards) renders saved search excerpts into an 18-second vertical video with source attribution.

Try the [interactive quote timeline](https://arcmira.github.io/integrations/quote-timeline/) to explore five conversations about vibe coding with quoted passages and timestamped video playback.

For editors and researchers, [build a source-linked brief](guides/source-checking) with a copyable research prompt, a timestamped example, and checks for attribution, context and source availability.

## Install the Python package

```sh
pip install langchain-arcmira==0.1.6
export ARCMIRA_API_KEY='your-key'
python - <<'PYTHON'
from langchain_arcmira import ArcmiraSearch

result = ArcmiraSearch().invoke({"q": "AI agents", "limit": 5})
for chunk in result["chunks"]:
    print(chunk["text"], chunk["watch_url"])
print(result["note"])
PYTHON
```

See the [Python guide](packages/langchain-python) for entity resolution, filters, async calls, and LangGraph setup.

## Install the TypeScript package

```sh
npm install @arcmira/langchain@0.1.0 @langchain/core zod
export ARCMIRA_API_KEY='your-key'
node --input-type=module <<'JS'
import { createArcmiraTools } from '@arcmira/langchain';
const [search] = createArcmiraTools({ apiKey: process.env.ARCMIRA_API_KEY });
const result = await search.invoke({ q: 'AI agents', limit: 5 });
console.log(result);
JS
```

Use an [Arcmira API key](https://arcmira.com/docs/authentication) in server-side configuration. Pass both returned tools to your LangChain agent or LangGraph `ToolNode`. The API key never belongs in tool arguments or a public browser bundle.

## What the tools cover

- **Search transcript passages:** filter indexed videos by channel, entity, speaker, date, source, and sponsored or organic mentions.
- **Resolve names:** find the right IDs before filtering. Preserve ambiguity when a name has multiple matches.

LangChain, AI SDK, n8n, Dify and Appmixer expose search and entity resolution. The Activepieces action exposes transcript search. Pipedream adds channel sponsor reads. Appmixer also provides an advanced authenticated API action. Airbyte exports scoped channel videos, mentions and recommendations. Meltano reads scoped mentions and optional recommendations. Host validation and publication status vary by adapter; see the table above. Full transcripts, sponsor research and monitors are available through the [Arcmira SDKs](https://arcmira.com/docs/libraries) and [MCP server](https://arcmira.com/docs/mcp-server).

A paid read uses credits from your plan, then your on-demand budget. Coverage and account access vary. An empty result does not mean a topic was never discussed. Preserve returned source labels, notes and links when presenting evidence.

## Verification

Python LangChain 0.1.6 uses Arcmira SDK 0.6.0. Its wheel passed 58 adapter tests with external network connections blocked, and both public PyPI archives match the tested artifacts. Earlier live integration checks used no credits or model inference. See [release verification](RELEASE.md#python-langchain-016) for evidence and scope.

The TypeScript LangChain package and AI SDK each have 14 tests covering native tool execution, input filters, source evidence, ambiguous entities, errors and cancellation. LangChain runs through a compiled LangGraph; the AI SDK runs its tool loop with simulated model decisions. Both have also completed authenticated search and entity resolution against the live Arcmira API. No model inference is included in these checks.

Activepieces has 13 tests, a bundled-package check, and a successful authenticated search through its native host. n8n has seven routing-engine tests, a parameter-contract check, and successful authenticated search and entity resolution through its native host. Dify has 18 SDK tests and successful local SDK calls to the live API. Plugin 0.1.2 also completed native entity resolution and a bounded transcript search in Community Edition 1.17.1, preserving source labels, citations and coverage notes with no model tokens or observed credit use. Dify Cloud workflow execution remains unverified. The Activepieces and n8n adapters retain their MIT licenses; LangChain, AI SDK and Dify use Apache-2.0.

Run `./scripts/ci.sh` to install locked dependencies and check all packages locally. The JavaScript checks need Node.js 22 or later and pnpm 10.4.1. Dify and the Python LangChain checks need Python 3.12 and uv. Airbyte checks need an existing Python 3.12 environment with its locked dependencies; see the [Airbyte guide](packages/airbyte). Use `./scripts/ci.sh --offline` to prohibit dependency downloads and fail on missing cached artifacts. Meltano checks need its locked Python environment, described in the [Meltano guide](packages/meltano). See [release status](RELEASE.md) for tested versions and remaining publication steps.

## Feedback

[Open an issue](https://github.com/arcmira/integrations/issues) with the framework version, package version, a small reproduction and the API error code or request ID. Never include API keys, access tokens or unrelated account data.
