# Arcmira: YouTube Transcript Search

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

[Available on npm as @arcmira/ai-sdk 0.1.0](https://www.npmjs.com/package/@arcmira/ai-sdk) for the Vercel AI SDK.

[Open the AI SDK setup guide](https://arcmira.github.io/integrations/ai-sdk/) for a copyable setup prompt and examples.

Search indexed YouTube transcripts for timestamped passages. Resolve names to IDs, then filter by channel, speaker, topic, transcript source, or sponsored and organic passages.

## Quick start

Install the published package:

```sh
npm install @arcmira/ai-sdk@0.1.0 ai zod
```

Set `ARCMIRA_API_KEY` and your model provider's credentials in the server environment.

```ts
import { generateText, isStepCount } from 'ai';
import { createArcmiraTools } from '@arcmira/ai-sdk';

const apiKey = process.env.ARCMIRA_API_KEY;
if (!apiKey) throw new Error('Set ARCMIRA_API_KEY');

const { text } = await generateText({
  model: 'openai/gpt-5-mini',
  tools: createArcmiraTools({ apiKey }),
  prompt: 'Find passages discussing AI agents. Return timestamped source links and preserve any coverage limitations.',
  stopWhen: isStepCount(5),
});

console.log(text);
```

The model string uses the AI SDK's gateway. Configure its credentials separately. Model inference may have its own cost.

## Tools

- `arcmiraSearch` searches transcript passages. Use one topic per call. The API defaults to five chunks and accepts up to twenty. It supports channel, entity, speaker, passage class, publication date and transcript source filters.
- `arcmiraResolve` resolves a person, organization, product, topic or channel. Search filters take IDs. Preserve ambiguous candidates and ask for clarification when the intended entity is uncertain.

Results retain the API's source links, publication dates, speaker information and coverage notes. Indexed coverage varies. Speaker labels cover a minority of shows. An empty result does not establish that a topic or person never appeared in a video.

A paid read uses credits from your plan, then your on-demand budget. Search uses four credits per returned chunk after the first five. Account access and freshness limits still apply. API refusals retain their typed error body. The adapter does not retry a refused request or silently substitute another transcript source.

The tools accept the AI SDK cancellation signal. This adapter exposes search and entity resolution. Full transcripts, recommendations, account management and monitor writes remain available through Arcmira's SDK or MCP server.

## Documentation

- [Search reference](https://arcmira.com/docs/search)
- [Arcmira libraries](https://arcmira.com/docs/libraries)

## Verification

The next release, 0.1.1, uses Arcmira SDK 0.6.2, AI SDK 7.0.127 and Zod 4.6.5. Published 0.1.0 uses SDK 0.6.0. AI SDK 7.0.127 and its changed dependencies passed the repository's seven-day package hold on October 8, 2026. `npm run build` checks types. `npm test` runs the AI SDK tool-execution loop with simulated model and API responses. An earlier live check with SDK 0.4.3 ran search and entity resolution against Arcmira with existing smoke-test access. Both return real results through the AI SDK execution loop, using simulated model decisions. Timestamped evidence reaches the next model step. No paid model inference is included.

Publication and tools-registry inclusion are separate steps. Recheck the registry's current-SDK compatibility requirement before submitting the tools-registry pull request; the newest npm release can be newer than this repository's eligible test version.
