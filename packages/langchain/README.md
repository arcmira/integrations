# Arcmira: YouTube Transcript Search for LangChain

Native LangChain tools for searching indexed YouTube transcripts and resolving people, organizations, products, topics and channels with Arcmira.

Check [release status](https://github.com/arcmira/integrations/blob/master/RELEASE.md) for npm and catalog availability. The quick start below runs the source checkout.

[API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

## Quick start

Use Node.js 22 or later.

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/packages/langchain
npm ci --ignore-scripts
npm run build
export ARCMIRA_API_KEY='your-key'
node --input-type=module <<'JS'
import { createArcmiraTools } from "./dist/index.js";

const [search, resolve] = createArcmiraTools({
  apiKey: process.env.ARCMIRA_API_KEY ?? "",
});

const result = await search.invoke({ q: "AI agents", limit: 5 });
console.log(result);
JS
```

The registry package exports the same function as `@arcmira/langchain`. Its peers are `@langchain/core` and `zod`.

Pass both returned tools to a LangChain agent or a LangGraph `ToolNode`. The tool names are `arcmira_search` and `arcmira_resolve`. The API key belongs in server-side configuration, never in tool arguments or a public browser bundle.

Resolve a name before using ID filters. A channel's `youtube_channel_id` goes in `channel_ids`. Preserve ambiguous results for the user to disambiguate. Search accepts the current API's topic, entity, channel, speaker, mention kind, source, date and result-limit filters. Returned passages retain source URLs, timestamps and coverage notes.

A paid read uses credits from your plan, then your on-demand budget. Account access and indexed coverage vary. An empty result does not prove a topic was never discussed. Speaker labels are not available for every show. These tools expose search and entity resolution; they do not retrieve a full transcript or manage monitors.

API errors propagate with their code, status and response body. The adapter makes no retries and does not change refused filters or transcript sources. When using `ToolNode`, choose error handling for your application; the verification workflow uses `{ handleToolErrors: false }` to retain the original SDK error. Runnable cancellation reaches the API request.

## Local verification

`npm run build` checks the public TypeScript declarations. `npm test` runs a compiled LangGraph against synthetic HTTP fixtures, covering filters, evidence, entity ambiguity, refusal responses, input validation and cancellation. The separate live check executes search and entity resolution against Arcmira through a compiled LangGraph with existing smoke-test access. Both return source-backed data. No model inference is part of these checks. Production authentication rejection is also verified with an invalid key.
