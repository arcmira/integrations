# Build a source-linked brief from YouTube transcript search

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Playable quote demo](https://arcmira.github.io/integrations/quote-timeline/)

Turn a research question into a shortlist of quotes an editor can check against the original video. This guide uses the saved "vibe coding" example from five channels, with a prompt you can adapt for your own research.

## Find candidate passages

[Connect Arcmira to your AI](https://arcmira.com/agent-setup), then paste this prompt:

```text
Find passages about vibe coding in videos published from January 1 through
September 10, 2026. Prioritize Masters of Scale, TBPN, Monitor The Situation,
Lenny's Podcast, and Theo at t3.gg.

Build a shortlist with each video's title, channel, publication date,
verbatim passage, timestamp, and source link. Keep transcript source labels
and coverage notes. Identify the speaker only when supported by the evidence.
Keep surrounding context when a passage could be misleading on its own.

Tell me which links and recordings you actually checked. Flag sources you
could not play or verify. Do not infer that no discussion occurred from an
empty search result. I will review the shortlist before choosing quotes.
```

Set the dates and channels to match your question. The saved demo is an editorial selection from a bounded search, not a ranking of every video about the topic. A new search may return different candidates.

## Check a quote against its recording

Open the [saved demo](https://arcmira.github.io/integrations/quote-timeline/) and select Masters of Scale. Its source record points to *What AI will do to work, according to 5 people building it*, published August 11, 2026, at 13:43:

> Vibe coding is is essentially using an AI chatbot to bring your ideas to life.

[Play the source at 13:43](https://www.youtube.com/watch?v=mD1F-yy_D8E&t=823s) or [open the transcript](https://arcmira.com/watch?v=mD1F-yy_D8E&t=823). The saved excerpt preserves the repeated "is". Listen before and after the pin to check the wording and meaning before quoting it.

The demo's pins use whole-second caption cues near sentence starts. Do not describe them as word-level alignment. The channel identifies the publisher, not necessarily the speaker. Keep speaker attribution unresolved until the recording or transcript evidence supports a name.

If playback fails, try the direct YouTube link. If the recording is unavailable, flag the quote for replacement or further verification. An earlier Monitor The Situation selection became private and was replaced. The [saved fixture](../../examples/quote-timeline/fixture.js) retains that reason alongside the replacement source.

## Keep transcript quality visible

Preserve the returned transcript source when exporting results. Captions and Arcmira Premium transcripts have different provenance. Premium provides speaker-labeled audio transcripts; do not silently substitute captions when the assignment calls for Premium. See the [transcript source and access documentation](https://arcmira.com/docs/transcripts).

A paid read uses credits from your plan, then your on-demand budget. Preserve any coverage or access limits reported by the API.

## Hand the editor a checkable brief

For each selected passage, retain the quote, relevant context, source title, channel, publication date, timestamp link, transcript source, and speaker evidence. Record when you checked playback and what remains unverified. Keep the search window and selection criteria with the brief so a reader can understand its scope.

Use the [five-source demo](../../examples/quote-timeline) to inspect the saved result without an API key. It presents a dated example; it does not establish that every source is still available today. Verify availability again before publication.
