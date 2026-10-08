# YouTube transcript search to a reel

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Watch the reel](https://x.com/zealcaiden/status/2105705296597524558)

Source discovery → selected moments → a local JavaScript Canvas and ffmpeg edit. Finding the spoken passages gives an editor a shortlist to watch before arranging footage, captions and motion.

Start with this research prompt:

```text
Find five candidate YouTube moments about [topic] for a short reel.
Keep each exact transcript excerpt, source URL, passage timestamp and
available speaker attribution. Flag uncertain attribution and incomplete
coverage. Explain why each moment fits, then let me choose what to watch.
```

The original production combined public MCP discovery, internal transcript access and human selection. This is a high-level account of that process, not a public-only reproduction recipe.

1. **Discover candidate speech.** Search for the topic and relevant people, then retain source links with the passages. A transcript match gives you a place to investigate; watch the surrounding recording before using it in an edit.

2. **Choose the moments.** A human selected the first and last words and each clip's narrative role. Review who is speaking, who appears on screen and what the surrounding conversation means. Passage timestamps locate source material; they are not proof of frame-accurate cut boundaries.

3. **Carry evidence into the edit.** The production kept a source manifest with selected spans, speaker labels and available word timings. Local footage extraction and timing corrections followed that selection. Keep the original watch links alongside your editing notes so another person can check the context.

4. **Animate and render locally.** Custom JavaScript Canvas code arranged footage cards, captions and camera motion. Headless Chrome rendered frames; ffmpeg encoded the video and combined it with audio. Human direction and synchronization corrections remained part of the work.

For a separate, inspectable example of presenting saved search results, try the [quote-timeline demo](https://arcmira.github.io/integrations/quote-timeline/); it uses excerpt cards without footage or audio.
