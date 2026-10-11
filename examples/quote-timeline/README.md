# YouTube transcript search to playable quotes

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Live demo](https://arcmira.github.io/integrations/quote-timeline/) · [Connect your AI](https://arcmira.com/agent-setup)

Five editorial selections from 2026 videos on Masters of Scale, TBPN, Monitor The Situation, Lenny’s Podcast and Theo at t3.gg. Each card preserves a complete spoken thought. Select a source and click **Play source** to hear its original audio. The YouTube controls provide seeking and volume.

Serve this folder locally:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open <http://127.0.0.1:8080>. No credentials or Arcmira API calls are needed. Playback loads the original video through YouTube’s embedded player. Selecting another source destroys the previous player. If an embed fails, use the YouTube timestamp link. Clipboard failures expose selectable text.

`fixture.js` preserves the quote text, source metadata, date window and selection notes. Punctuation and line breaks are formatted for reading; repetitions remain. Playback pins use caption cues near sentence starts, not word-level alignment. This is a partial editorial selection, not an exhaustive search or ranking. The former MTS video became private; a different MTS video replaces it. The corrected Columbia quote remains in the source notes.

The header uses the production Arcmira image and Helvetica Now Display cuts. Preserve the capitalized wordmark, 25px mark, 19px type, 600 weight, 28.5px line height, zero letter spacing and 10px gap. This demo uses the owner-approved black header with white text. Do not independently typeset or decorate the brand.
