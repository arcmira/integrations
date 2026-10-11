# YouTube transcript search → quote timeline

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Live demo](https://arcmira.github.io/integrations/quote-timeline/) · [Connect your AI](https://arcmira.com/agent-setup)

A static, keyboard-accessible example of turning saved Arcmira search results into a source-linked quote sequence. Serve this folder locally:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8080>. No credentials or Arcmira API calls are needed. Playback loads the original videos through YouTube’s embedded player.

The prompt near the top is copyable. Select a source and click **Play source** to hear its original audio at the saved passage timestamp. Use the YouTube controls to seek or adjust volume. Each card displays a short, verbatim transcript excerpt, its channel, video ID and exact source passage timestamp. Copy the timestamp link to return to its context.

`fixture.js` contains two playable saved results for a global “vibe coding” search restricted to videos published in August 2026. The original search returned three results; the third video was private on YouTube when checked October 11, 2026 and is recorded under `excludedSources`. Search coverage is partial. These are examples, not a complete survey. Channel names are not speaker attributions. Source timestamps mark the returned passage start; the short excerpt can begin later within that passage.

Selecting another source stops the previous video. The page never substitutes generated speech for source audio. If YouTube blocks an embed, use its timestamp link. Clipboard failures expose selectable text.

The header uses the production Arcmira mark, Helvetica Now Display cuts, and header lockup dimensions. Preserve its capitalization, 25px mark, 19px wordmark, 600 weight, zero letter spacing, and 10px gap. Do not replace it with an independently typeset wordmark.
