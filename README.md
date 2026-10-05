# Arcmira: YouTube Transcript Search Integrations

[API docs](https://arcmira.com/docs) · [Usage and billing](https://arcmira.com/docs/usage-and-billing) · [MCP and agent skills](https://github.com/arcmira/mcp)

Give your agent tools to search indexed YouTube transcripts and resolve people, organizations, products, topics and channels. Results retain timestamped source links and coverage notes.

| Integration | Source | Status |
| --- | --- | --- |
| LangChain / LangGraph | [Setup and tools](packages/langchain) | Source preview; npm and catalog publication pending |
| Vercel AI SDK | [Setup and tools](packages/ai-sdk) | Source preview; npm and catalog publication pending |

## Try the LangChain source preview

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/packages/langchain
npm ci --ignore-scripts
npm run build
export ARCMIRA_API_KEY='your-key'
node --input-type=module <<'JS'
import { createArcmiraTools } from './dist/index.js';
const [search] = createArcmiraTools({ apiKey: process.env.ARCMIRA_API_KEY });
const result = await search.invoke({ q: 'AI agents', limit: 5 });
console.log(result);
JS
```

Use an [Arcmira API key](https://arcmira.com/docs/authentication) in server-side configuration. Pass both returned tools to your LangChain agent or LangGraph `ToolNode`. The API key never belongs in tool arguments or a public browser bundle.

## What the tools cover

- **Search transcript passages:** filter indexed videos by channel, entity, speaker, date, source, and sponsored or organic mentions.
- **Resolve names:** find the right IDs before filtering. Preserve ambiguity when a name has multiple matches.

These previews expose search and entity resolution. Full transcripts, sponsor research and monitors are available through the [Arcmira SDKs](https://arcmira.com/docs/libraries) and [MCP server](https://arcmira.com/docs/mcp-server).

A paid read uses credits from your plan, then your on-demand budget. Coverage and account access vary. An empty result does not mean a topic was never discussed. Preserve returned source labels, notes and links when presenting evidence.

## Verification

Each integration has 14 tests covering native tool execution, input filters, source evidence, ambiguous entities, errors and cancellation. LangChain runs through a compiled LangGraph; the AI SDK runs its tool loop with simulated model decisions. Both have also completed authenticated search and entity resolution against the live Arcmira API. No model inference is included in these checks.

Run `./scripts/ci.sh` to install locked dependencies and check both packages locally, or run `npm ci --ignore-scripts`, `npm run build` and `npm test` inside either package. Node.js 22 or later is required. See [release status](RELEASE.md) for tested versions and remaining publication steps.

## Feedback

[Open an issue](https://github.com/arcmira/integrations/issues) with the framework version, package version, a small reproduction and the API error code or request ID. Never include API keys, access tokens or unrelated account data.
