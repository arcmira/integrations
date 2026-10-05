# Arcmira: YouTube Transcript Search

[API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

Source preview for the Vercel AI SDK. This package is not published to npm yet.

Search indexed YouTube transcripts for timestamped passages. Resolve names to IDs, then filter by channel, speaker, topic, transcript source, or sponsored and organic passages.

## Quick start

After publication, install `@arcmira/ai-sdk` with `ai` and `zod`. Set `ARCMIRA_API_KEY` and your model provider's credentials in the server environment.

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

The tools accept the AI SDK cancellation signal. This candidate exposes search and entity resolution. Full transcripts, recommendations, account management and monitor writes remain available through Arcmira's SDK or MCP server.

## Documentation

- [Search reference](https://arcmira.com/docs/search)
- [Arcmira libraries](https://arcmira.com/docs/libraries)

## Candidate verification

Built with Arcmira SDK 0.4.3, AI SDK 7.0.118 and Zod 4.6.5. `npm run build` checks types. `npm test` runs the AI SDK tool-execution loop with simulated model and API responses. A separate live check runs search and entity resolution against Arcmira with existing smoke-test access. Both return real results through the AI SDK execution loop, using simulated model decisions. Timestamped evidence reaches the next model step. No paid model inference is included.

Before release: test the current AI SDK after the repository's seven-day package hold, publish a dedicated integration guide and release the package from a public Arcmira repository. Then submit the tools-registry pull request.
