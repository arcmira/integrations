# YouTube transcript search → quote timeline

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Live demo](https://arcmira.github.io/integrations/quote-timeline/) · [Connect your AI](https://arcmira.com/agent-setup)

A static, keyboard-accessible example of turning saved Arcmira search results into a source-linked quote sequence. Open `index.html` directly, or serve this folder:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8080>. No dependencies, credentials, API calls or media downloads are needed.

The prompt near the top is copyable. Select a source, scrub the 18-second sequence, or play it. Each card displays a short, verbatim transcript excerpt, its channel, video ID and exact source passage timestamp. Copy the timestamp link to return to its context.

`fixture.js` contains three saved results for a global “vibe coding” search restricted to videos published in August 2026. Search coverage is partial. These are examples, not a complete survey. Channel names are not speaker attributions. Source timestamps mark the returned passage start; the short excerpt can begin later within that passage.

Each card occupies six seconds of the demo. This is a presentation clock, not audio playback or word timing. Reduced-motion preferences remove the reveal effect. Clipboard failures expose selectable text.
