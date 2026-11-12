# Summarize any YouTube video with timestamped links using Arcmira and Claude

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Transcripts](https://arcmira.com/docs/transcripts) · [MCP server](https://arcmira.com/docs/mcp-server) · [Plans and usage](https://arcmira.com/docs/usage-and-billing)

Send a YouTube link to this n8n webhook and get back a short summary of the video. Arcmira reads the transcript, and Claude picks the 5 to 8 most useful moments. Each moment quotes the whole sentences said there and links to the second they start, so you can check it in one click.

The fastest way to get this is built in: connect the [Arcmira MCP server](https://arcmira.com/docs/mcp-server) to your assistant, paste a YouTube link and ask for a summary. It reads the whole transcript and can link each point to the second it was said. Use this template when you want the summary inside an n8n flow, for example as a webhook other tools can call, or to send each summary on to Slack, email or a doc.

## What you get

The webhook answers with JSON, and its `summary` field is Markdown. This one came from a live run on November 10, 2026, for a 47-minute episode of Odd Lots:

```text
Odd Lots hosts Tracy Alloway and Joe Weisenthal talk with Andy Kadin, owner of LA's Bub and Grandma's, about running a wholesale bakery, a sandwich restaurant and an upcoming pizzeria. The conversation uses baking to look at the wider economy: flour prices, labor costs, delivery, pricing decisions, LA bureaucracy and a wave of restaurant closures. It suits listeners curious about small-business economics or the food industry.

[6:52](https://www.youtube.com/watch?v=eKGNctKpx8w&t=412s) Andy describes the size of the wholesale operation today. "The wholesale bakery, which is what that story evolved into, is now a 50 person business. We have a 6,500 foot facility that produces bread, just bread, not pastry, for about 180 restaurants in Los Angeles."
[11:50](https://www.youtube.com/watch?v=eKGNctKpx8w&t=710s) He explains why they kept their own vans and drivers instead of outsourcing delivery. "They are our point of contact with our customers. And if that is not an authentic connection, if that is not something our employees are connecting with our customers, there's a potential for things to go wrong and a potential for that relationship to be soured."
[17:58](https://www.youtube.com/watch?v=eKGNctKpx8w&t=1078s) He describes how the Russia-Ukraine war pushed up US wheat prices and forced a rare price increase. "Um, so we saw maybe a 10 10% increase in flower pricing. It caused us to have to drive our prices up for the first time uh in a long time bread-wise."
[23:57](https://www.youtube.com/watch?v=eKGNctKpx8w&t=1437s) He breaks down bakery economics, where labor matters far more than ingredients. "So if we're talking about the traditional model where you see like 30% for labor, we're looking at more 42% for labor and 12% for COGS where COGS typically in a restaurant food business environment is somewhere to 25 to 30 if you're doing okay."
[26:59](https://www.youtube.com/watch?v=eKGNctKpx8w&t=1619s) He explains why prices stayed high even after flour costs came back down. "Other expenses like labor and outside things are have increased to the point where we can't lower the prices back down. It's just the way that it goes."
[29:03](https://www.youtube.com/watch?v=eKGNctKpx8w&t=1743s) He describes how LA permitting dragged out the restaurant opening, which took three years. "You know, a lot of it is very analog. they print up your application and it sits on a literal stack on someone's desk and if you don't follow up with them incessantly that stack just gets piled on top and your thing just disappears deep into the uh you know into the pile."
[36:36](https://www.youtube.com/watch?v=eKGNctKpx8w&t=2196s) He rejects chasing viral social media fame in favor of regular customers. "So for us, trends are are a business killer. You can get short short success from a trend, but if you want to be here for a long time and build a customer base that's dedicated, you have to have an authentic relationship with those people."
[39:53](https://www.youtube.com/watch?v=eKGNctKpx8w&t=2393s) He gives a blunt view of doing business in LA right now. "It's excruciating. Um, this city is is uh especially in the in the food business is is very very much struggling. Um, I've never ever seen so many closures of restaurants, good ones, that deserve to be open, um, in my time, you know, let alone being a consumer, but being in the business."
```

The first moment opens the video at 6:52: https://www.youtube.com/watch?v=eKGNctKpx8w&t=412s

Each quote is checked against the transcript before it is linked. The answer also lists every moment in `moments`, each with `at`, `seconds`, `url`, `text`, `quote` and `quote_in_transcript`, and counts `quotes_not_in_transcript`, `times_past_the_end` and `arcmira_credits_used`. The whole answer is in [`sample-response.json`](sample-response.json). Its `arcmira_credits_used` is 0 because the same account had read that transcript earlier that day. That first read used 16 credits.

## Setup

1. Make an Arcmira account at https://arcmira.com/sign-up?src=n8n-video-summary&utm_source=n8n&utm_campaign=n8n-video-summary and copy an API key. The Free plan has 1,000 credits a month.
2. In n8n, choose **Import from URL** and paste the [workflow JSON URL](https://raw.githubusercontent.com/arcmira/integrations/master/examples/n8n-video-summary/video-summary.n8n.json).
3. Add a **Header Auth** credential with the name `Authorization` and the value `Bearer <your key>`. Pick it in **Get transcript from Arcmira**.
4. Add your Anthropic key in **Claude model**. It uses `claude-opus-5-5` with adaptive thinking. Pick another model there if you like.
5. Activate the workflow and send a link to its production URL:

```bash
curl -X POST <production webhook URL> -H 'Content-Type: application/json' -d '{"url": "https://youtu.be/eKGNctKpx8w"}'
```

A link that isn't from YouTube answers 400. A wrong Arcmira key answers 500 and names the node to fix. A video with no transcript answers 404 with Arcmira's own message.

## What Arcmira returns

Arcmira returns the exact quote and a watch link cued to the second, so the reader can check the source. This template makes one call:
- `GET /v1/transcripts/{video_id}?quality=captions&timestamps=true`: the transcript as timed `lines`, with the video's title, channel, length and `watch_url`.

Each summary uses credits from your plan. A caption transcript uses 4 credits per started 15 minutes. Repeating the same request within 7 days costs nothing.

## Build this with your agent

The same summary needs no n8n. Paste this into Claude, or any agent connected to the [Arcmira MCP server](https://github.com/arcmira/mcp), and fill in a YouTube link:

```text
Use Arcmira (the arcmira MCP server, or its API with my key). Whenever I send a YouTube link, summarize the video with timestamped links. Start with YOUR_YOUTUBE_LINK.
1. Read the whole transcript once, with no start or end (GET /v1/transcripts/{video_id}?quality=captions&timestamps=true). If the answer has next_start, read on from there to the last line, one read at a time.
2. Write two or three sentences on what the video covers and who it is for.
3. Pick the 5 to 8 most useful moments. For each, say in one sentence what is said, then quote the whole sentences that hold it, word for word, at most about 300 characters. If those sentences run longer, quote fewer of them. Start each quote at a sentence's first word.
4. Link each moment to the start of the line that holds the quote's first word, even when that word ends the line, with the transcript's video.watch_url plus &t={start}s, in whole seconds.
Check it worked: confirm each quote appears word for word at its linked second.
```

## Verification

- On November 10, 2026 the workflow ran in n8n 2.46.6 as a production webhook, with Claude (`claude-opus-5-5`) in its Anthropic node. Four YouTube links answered 200 with 32 moments. Every quote was found word for word in its transcript, and each links to the line where it starts. A first read of a 56-minute video used 16 credits. A link that isn't from YouTube answered 400, a wrong key 500, and a video with no transcript 404.
- It passed n8n's import and export round trip, a check of every node parameter against n8n's own node definitions, and the code-node tests.
- On November 10, 2026, an earlier wording of the agent prompt ran once in Claude Sonnet 5.5 with the Arcmira MCP server, on the same Odd Lots episode. Its transcript call had no `&timestamps=true`, and its step 4 did not ask for whole seconds. It read the transcript to the last line and picked 8 moments, each quote found word for word at its linked second, and linked all 8 in whole seconds. The wording above has not run.
- It has not run on the Free plan or in n8n Cloud. In that run the Anthropic node reached Claude through a gateway, not with a key sent straight to Anthropic.

## Files

- [`video-summary.n8n.json`](video-summary.n8n.json): the workflow. Its Arcmira HTTP node sends `x-arcmira-client: n8n-template/video-summary`.
- [`sample-response.json`](sample-response.json): the webhook's answer for the sample above, from the live run.
