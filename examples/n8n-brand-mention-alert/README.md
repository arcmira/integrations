# Get a Slack alert when your brand is mentioned in a YouTube video with Arcmira

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Monitors](https://arcmira.com/docs/monitors) · [Plans and usage](https://arcmira.com/docs/usage-and-billing)

Every hour this n8n workflow reads the alerts on your Arcmira brand monitor, reads the transcript of each new video, finds the sentence that names your brand and posts it to Slack. Each message links to the second the brand was mentioned, so you can check it in one click.

The fastest way to get this is built in: [an Arcmira monitor](https://arcmira.com/docs/monitors) can post to Slack on its own, with the quoted line and a link to the second. Use this template when you want the alert inside an n8n flow, for example to add a CRM step or your own spellings.

## What you get

One Slack message per mention. This one came from a live run on November 11, 2026:

```text
*Cloudflare* was mentioned on YouTube in *The man who fought Napster is now fighting AI | Decoder* (Decoder with Nilay Patel)
> We had the CEO of Cloudflare on the show.
<https://www.youtube.com/watch?v=i1K0iK1EIdE&t=784s|Watch at 13:04>
```

The link opens the video at 13:04: https://www.youtube.com/watch?v=i1K0iK1EIdE&t=784s

Transcripts often misspell brand names. The workflow matches your brand's name, any spellings you list, and close spellings, and says so when it used one. When the transcript doesn't spell the name out, the message links the video's start.

## Setup

1. Make an Arcmira account at https://arcmira.com/sign-up?src=n8n-brand-mention-alert&utm_source=n8n&utm_campaign=n8n-brand-mention-alert and a monitor for your brand in the dashboard. Copy the monitor id (`mon_...`) and an API key.
2. In n8n, choose **Import from URL** and paste the [workflow JSON URL](https://raw.githubusercontent.com/arcmira/integrations/master/examples/n8n-brand-mention-alert/brand-mention-alert.n8n.json).
3. Add a **Header Auth** credential with the name `Authorization` and the value `Bearer <your key>`. Pick it in **Get monitor alerts from Arcmira** and **Get transcript from Arcmira**.
4. In **Settings**, paste the monitor id. Add other spellings of your brand to `also_match`, comma separated.
5. Connect Slack in **Post to Slack**, set the channel id, and activate the workflow. It runs at five past every hour.

## What Arcmira returns

Arcmira returns the exact quote and a watch link cued to the second, so the reader can check the source. This template makes two calls:
- `GET /v1/monitors/{id}/alerts`: newest alerts, each with a `video_id`.
- `GET /v1/transcripts/{video_id}`: the transcript as timed `lines`.

Each alert uses 25 credits from your plan, once. A caption transcript uses 4 credits per started 15 minutes. The Free plan has 1,000 credits a month.

## Build this with your agent

The same alert needs no n8n. Paste this into an agent that has the [Arcmira MCP server](https://github.com/arcmira/mcp), Slack access and scheduled tasks, such as Claude, and fill in your monitor id:

```text
Use Arcmira (the arcmira MCP server, or its API with my key). Every hour, send new YouTube mentions of my brand to Slack. My Arcmira monitor is mon_YOUR_MONITOR_ID.
1. Read the monitor's alerts (GET /v1/monitors/{id}/alerts?limit=100) and keep those created in the last whole hour, one per mention.
2. Read each video's whole transcript (GET /v1/transcripts/{video_id}). If the answer has next_start, read on from there to the last line, one read at a time.
3. Find the whole sentence that names the brand, allowing for misspellings in the transcript.
4. Post the brand, the video title, that sentence in quotes, word for word, and the transcript's video.watch_url plus &t={start}s, where start is the start of the line that holds the brand's name, in whole seconds.
Check it worked: run steps 1 to 4 once over the last 72 hours and show me the messages before you schedule it.
```

## Limits

It tries each Arcmira call up to 5 times, one video at a time. Each run reads the newest 100 alert rows. Each recipient on the monitor adds a row, so a monitor with many recipients can pass 100 in an hour, and the mentions past 100 are not posted. An hour that fails, or that passes while n8n is down, is not read again. To catch up, run it once by hand with a larger `hours_back`, then set it back to 1; alerts it already posted post again.

## Verification

- On November 11, 2026 the workflow ran in n8n 2.46.6 against a real Arcmira monitor, over 72 hours of its alerts. 15 alerts became 15 messages to a local Slack stand-in. 13 quote the whole sentence that names the brand, and 2 link the video's start because the transcript doesn't spell the name out.
- In a second run, a stand-in answered the first read of the second video's transcript with a 503. n8n read it again 5 seconds later, and the run posted the same 15 messages.
- It passed n8n's import and export round trip, a check of every node parameter against n8n's own node definitions, and the code-node tests. The tests cover a name inside another word (ramped, nonlinear, precursor), alerts in consecutive hours, and refusals by status and code.
- The agent prompt above ran once in Claude Sonnet 5.5 with the Arcmira MCP server on November 11, 2026, over 72 hours of the same monitor's alerts. It wrote 15 messages for the same 15 mentions the workflow posted. Every quote is word for word from its transcript, and every link lands on the line that holds the brand's name. 14 quotes are a whole sentence, and 1 comes from a caption with no sentence start. 11 quotes match the workflow's. The other 4 quote a different spelling or line of the same mention.
- It has not run with a real Slack account or on the Free plan.

## Files

- [`brand-mention-alert.n8n.json`](brand-mention-alert.n8n.json): the workflow. Every HTTP node sends `x-arcmira-client: n8n-template/brand-mention-alert`.
