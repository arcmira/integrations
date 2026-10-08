# YouTube transcript search to Remotion quote cards

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Video preview](https://arcmira.github.io/integrations/remotion-quote-cards/) · [Connect your AI](https://arcmira.com/agent-setup)

Render an 18-second vertical video from three saved Arcmira search results. Each animated card keeps the source channel, passage timestamp and YouTube URL visible. No credentials, API calls, video downloads or model calls are needed for the included example.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm render
```

Open `out/quote-cards.mp4`. The first render may download Remotion's headless browser. `pnpm still` also writes a PNG preview.

## Find your own source passages

Connect [Arcmira MCP](https://arcmira.com/docs/mcp-server), then copy this prompt into your agent:

> Find three short passages about [topic] in indexed YouTube videos published between [start date] and [end date]. Keep the original wording and nearby context for review. For each result, return its video ID, title, channel, publication date, passage start time in seconds, and timestamped source URL. Do not infer a speaker from the channel name. Keep excerpts brief and record the search scope and retrieval date.

Review the original source and context before publishing a quotation. Replace `src/quotes.json` with the reviewed results in the same structure, then run the commands again. Keep credentials out of this file. A paid read uses credits from your plan, then any top-up credits, then your on-demand budget.

The JSON was copied without changing values from the [source-linked timeline example](../quote-timeline/fixture.js). It records an August 2026 search for "vibe coding" and its retrieval date. These three results demonstrate the handoff; they are not a representative survey or complete coverage.

## Timing and attribution

Each card occupies six seconds. That presentation clock does not follow source audio or word timings. The timestamp is the returned passage start; the displayed excerpt can begin later in that passage. Channel names are source labels, not verified speaker identities.

This example renders text and source references only. It includes no source footage, music or speech audio. Adding media is a separate editorial and rights decision.

Edit `src/index.tsx` to change the layout. The project uses pinned Remotion 4.0.531 dependencies. Remotion has its [own license](https://www.remotion.dev/license); eligibility for free commercial use depends on your organization. This example does not promise that Remotion is free for every team.
