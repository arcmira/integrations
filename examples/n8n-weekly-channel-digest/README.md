# Send a weekly YouTube channel digest to Slack with Arcmira and Claude

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Transcripts](https://arcmira.com/docs/transcripts) · [Plans and usage](https://arcmira.com/docs/usage-and-billing)

Every Monday this n8n workflow lists the new videos on the YouTube channels you follow through Arcmira, reads each transcript, and asks Claude for 3 to 5 points per video. Each point quotes a whole sentence and links to the second it was said. One digest goes to Slack.

## What you get

One Slack digest a week. This is its first line and one of the seven videos, with three of its five points, from a live run on November 10, 2026:

```text
*New videos from your YouTube channels, published 2026-11-01 to 2026-11-08*

*Good PC Deals Still Exist!* (Linus Tech Tips)
- <https://www.youtube.com/watch?v=AAraNufcrW4&t=16s|0:16> He bought a refurbished Alienware gaming PC from the Dell Outlet at a low price. "I picked up this refurbished Alienware gaming PC for just $1,800."
- <https://www.youtube.com/watch?v=AAraNufcrW4&t=124s|2:04> The refurbished unit arrived in like-new condition. "In fact, not only were the bags in not cut open condition, but the mouse, keyboard, and power cord appeared to be 100% new."
- <https://www.youtube.com/watch?v=AAraNufcrW4&t=391s|6:31> Cooling held up well in torture testing despite the odd power supply. "So, our CPU with this dual 120 mm liquid cooling system never jumped over about 85 to 90° even in an OCCT Lin 2019 test."

Watch if: You are a PC gamer weighing a refurbished prebuilt from an outlet and want to see its real-world quirks and how to hunt for deals.
```

The first link opens the video at 0:16: https://www.youtube.com/watch?v=AAraNufcrW4&t=16s

## Limits

- It lists only channels Arcmira indexes. A channel that isn't indexed comes back empty, and the digest names it with a link to ask for it.
- Arcmira indexes most new videos within two days. So the digest covers the 7 days that ended 2 days before it runs, and the next digest picks up the rest. `days` and `wait_days` in **Settings** change this.
- On the Free plan the digest runs 30 days behind. The run asks `GET /v1/me` for the newest date the plan reads, which uses no credits, and lists the 7 days that end on that date. The digest's first line is Arcmira's note on where results stop, with its unlock link.
- It tries each Arcmira call up to 5 times.

## Setup

On the Free plan this digest runs 30 days behind, because the Free plan withholds the newest 30 days of media. A paid plan or the Pro trial reads last week's videos.

1. Make an Arcmira account at https://arcmira.com/sign-up?src=n8n-weekly-channel-digest&utm_source=n8n&utm_campaign=n8n-weekly-channel-digest and copy an API key.
2. In n8n, choose **Import from URL** and paste the [workflow JSON URL](https://raw.githubusercontent.com/arcmira/integrations/master/examples/n8n-weekly-channel-digest/weekly-channel-digest.n8n.json).
3. Add a **Header Auth** credential with the name `Authorization` and the value `Bearer <your key>`. Pick it in **Check the plan's dates**, **List channel videos from Arcmira** and **Get transcript from Arcmira**.
4. In **Settings**, paste your channel ids, comma separated. A channel id starts with `UC`. To get one from a handle, call `GET /v1/entities/resolve?q=@handle&type=channel` and read `best.youtube_channel_id`. It uses no credits.
5. Connect Anthropic in **Claude** and Slack in **Post to Slack**, set the Slack channel id, and activate the workflow. It runs every Monday at 8:00.

## What Arcmira returns

Arcmira returns the exact quote and a watch link cued to the second, so the reader can check the source. This template makes three calls:
- `GET /v1/me`: the newest date your plan reads (`freshness`). It uses no credits.
- `GET /v1/channels/{channel_id}/videos`: a channel's indexed videos, newest first.
- `GET /v1/transcripts/{video_id}?quality=captions&timestamps=true`: the transcript as timed `lines`.

A listed video uses 4 credits from your plan, and the first 5 in each request are free. A caption transcript uses 4 credits per started 15 minutes.

## Build this with your agent

The same digest needs no n8n. Paste this into Claude, or any agent connected to the [Arcmira MCP server](https://github.com/arcmira/mcp), and fill in your channel ids:

```text
Use Arcmira (the arcmira MCP server, or its API with my key). Every Monday, post a Slack digest of new videos on my YouTube channels UC_CHANNEL_ID_1 and UC_CHANNEL_ID_2.
1. Call arcmira.status() (GET /v1/me) first. List each channel's videos from the 7 days that ended 2 days ago (GET /v1/channels/{channel_id}/videos). If status() reports freshness, list the 7 days that end on its served_through instead, and say where results stop.
2. Read each video's transcript (GET /v1/transcripts/{video_id}?quality=captions&timestamps=true).
3. Read each whole transcript, then write 3 to 5 points per video, each quoting a whole sentence word for word.
4. Post each video's title from the list, its channel and points. Link each quote to the start of the line that holds its first word, with the transcript's video.watch_url plus &t={start}s, in whole seconds.
Check it worked: run it once now and show me the digest before you schedule it.
```

## Verification

- On November 10, 2026 the workflow ran in n8n 2.46.6 for Fireship and Linus Tech Tips, over videos published November 1 to 8. It found 7 videos and posted 35 points. 34 quotes are a whole sentence found word for word in the transcript at the linked second, and the 35th leaves out a speaker mark. On November 11, 2026 its Free path ran against a local server that played a Free key whose results stop at October 11. `GET /v1/me` named that date, and the run listed the 5 videos published October 4 to 11 on the first try, with no refusal. The digest opened with Arcmira's note and unlock link.
- It passed n8n's import and export round trip, a check of every node parameter against n8n's own node definitions, and the code-node tests. In a second run on November 11, 2026, a local stand-in failed `GET /v1/me`, one channel's list and one transcript read once. n8n asked each again 5 seconds later, and the digest held the same 7 videos as a run without it.
- The agent prompt above ran once in Claude Sonnet 5.5 with the Arcmira MCP server on November 11, 2026, on a paid plan. It called `status()` first, found no freshness limit, and listed the 7 days that ended 2 days before. It read all 8 transcripts to the end and wrote 37 points. Every quote is word for word in its transcript and linked, in whole seconds, to the line where it starts. The Free step did not come into play.
- It has not run with a real Slack, Anthropic or Free account. In these runs the same prompt went to Claude Sonnet 5.5 outside n8n, and a local stand-in took Slack's place.

## Files

- [`weekly-channel-digest.n8n.json`](weekly-channel-digest.n8n.json): the workflow. Every Arcmira call sends `x-arcmira-client: n8n-template/weekly-channel-digest`.
