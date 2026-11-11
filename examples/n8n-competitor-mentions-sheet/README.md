# Track competitor mentions on YouTube in Google Sheets with Arcmira

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Search and mentions](https://arcmira.com/docs/search) · [Plans and usage](https://arcmira.com/docs/usage-and-billing)

Every Monday this n8n workflow lists two weeks of YouTube mentions of each competitor you name, reads the transcript around each one and adds a row to a Google Sheet: the show, the video, the whole sentence that was said and a link to that second. Rows are keyed on the mention id, so the next run updates them instead of adding copies.

The fastest way to follow competitors is built in: an Arcmira [monitor](https://arcmira.com/docs/monitors) can email or post to Slack each new mention of the competitors it follows, with the quoted line and a link to the second. Use this template when you want every mention as a row in a Google Sheet, to sort, filter and share, and to keep a running record.

On the Free plan the sheet runs 30 days behind, because the Free plan withholds the newest 30 days of media, and it reads the first page of each list. A paid plan or the Pro trial reads the last 14 days. Each row uses 8 credits from your plan, 4 for the mention and 4 for the 150 seconds of transcript around it. The first 5 mentions in each request are free. The Free plan has 1,000 credits a month.

## What you get

One row per mention. This one came from a live run on November 10, 2026, with `ad_reads` true:

| Column | Value |
| --- | --- |
| `mention_id` | men_4282387 |
| `found_on` | 2026-11-10 |
| `competitor` | Supabase |
| `published` | 2026-11-08 |
| `show` | Starter Story |
| `video` | I made $1M from 30 different apps |
| `said_at` | 10:08 |
| `link` | https://www.youtube.com/watch?v=X2T92MVx7xs&t=608s |
| `what_was_said` | For back end, I use Superbase plus Cloudflare. |
| `why_it_came_up` | Tiwari uses the tool alongside Cloudflare as his backend infrastructure for building web apps. |
| `ad_read` | no |
| `views` | 983 |

The link opens the video at 10:08: https://www.youtube.com/watch?v=X2T92MVx7xs&t=608s

Pro+ and above fill the `ad_read` column when `ad_reads` is true in Settings. It says `yes` when Arcmira classes that second as the competitor's own sponsored read and `no` when it doesn't. `ad_reads` uses 40 credits for every ad read or recommendation in each video it checks, not only the matched one. In the November 10 run, 73 mentions read 11 such rows, 440 credits. On other plans, leave `ad_reads` false and the column stays blank.

Transcripts often misspell names, and the quote keeps the transcript's spelling, here "Superbase" for Supabase. The workflow also finds a name split in two, such as "Cloud flare", and close spellings of a one-word name. A whole-episode mention reads the full transcript, at 4 credits per started 15 minutes, and links the first line that names the competitor. A name Arcmira can't place, or only assumes, gets a note row with the ids to paste in Settings. When a plan withholds part of the window, the sheet gets one note row in Arcmira's words.

## Setup

1. Make an Arcmira account at https://arcmira.com/sign-up?src=n8n-competitor-mentions-sheet&utm_source=n8n&utm_campaign=n8n-competitor-mentions-sheet and copy an API key.
2. In n8n, choose **Import from URL** and paste the [workflow JSON URL](https://raw.githubusercontent.com/arcmira/integrations/master/examples/n8n-competitor-mentions-sheet/competitor-mentions-sheet.n8n.json).
3. Add a **Header Auth** credential with the name `Authorization` and the value `Bearer <your key>`. Pick it in **Resolve entity in Arcmira**, **Get mentions from Arcmira**, **Get older mentions from Arcmira** and **Get transcript from Arcmira**.
4. In **Settings**, list your competitors, comma separated. `context` says what they do, for names several companies share. An Arcmira id such as `ent_125036` works in place of a name. `days` is the window, and `ad_reads` fills the `ad_read` column on Pro+ and above.
5. Make a Google Sheet whose row 1 holds these headers, one per column: `mention_id, found_on, competitor, published, show, video, said_at, link, what_was_said, why_it_came_up, ad_read, views`. Connect Google in **Add rows to the sheet**, pick the sheet, and activate the workflow. It runs every Monday at 8:00.

## What Arcmira returns

Arcmira returns the exact quote and a watch link cued to the second, so the reader can check the source. This template makes three calls:
- `GET /v1/entities/resolve`: one entity id per name.
- `GET /v1/mentions`: each mention, its video, second and description, and on Pro+ its commercial class.
- `GET /v1/transcripts/{video_id}`: the timed lines around that second.

Resolve uses no credits. A mention uses 4 credits. A caption transcript uses 4 credits per started 15 minutes. An ad read or recommendation uses 40 credits.

## Build this with your agent

The same sheet needs no n8n. Paste this into Claude, or any agent connected to the [Arcmira MCP server](https://github.com/arcmira/mcp), and fill in your competitors:

```text
Use Arcmira (the arcmira MCP server, or its API with my key). Every Monday, add the last 14 days of YouTube mentions of COMPETITOR_ONE and COMPETITOR_TWO to a Google Sheet.
1. Resolve each name to one entity (GET /v1/entities/resolve). Tell me if it had to assume.
2. List its mentions since 14 days ago (GET /v1/mentions?entity_id=...&after=...), following next_cursor. If Arcmira says my plan can't read those dates, say so in one line, then run the same search over the newest 14 days it can read.
3. Read the transcript from 60 seconds before each start_seconds to 90 after (GET /v1/transcripts/{video_id}?start=...&end=...). Quote the whole sentence naming it, word for word from its first word to its last, up to 300 characters.
4. Write one row per mention id to a Google Sheet, or a CSV with every field in quotes if you have no Sheets tool: competitor, date, show, video title, the mention's media.url with &t={start_seconds}s, quote, description.
Check it worked: run it once, show me the rows, and confirm each quote is in the transcript at that second.
```

## Limits

It tries each Arcmira call up to 5 times. It reads at most 10 pages of 100 mentions per competitor each run.

## Verification

- On November 10, 2026, in n8n 2.46.6 with a paid key and a local stand-in for the sheet, seven names gave 73 mention rows and 1 note row for a made-up name. Every quote is in its transcript, within a line of the linked second. With `ad_reads` true, 6 rows were `yes` and 65 `no`. On November 11 the final revision wrote the same 74 rows, every cell the same but the date in the note row's id.
- On November 10 the Free path ran against a local stand-in. It refused the first mentions read with the documented `freshness_requires_paid` answer and answered the second with real mentions from the 14 days that end on October 11. The sheet got one note row in Arcmira's words, then 18 quoted rows. It has not run with a real Google Sheets account, a Free key or a Pro+ key.
- It passed n8n's import and export round trip, a check of every node parameter against n8n's own node definitions, and the code-node tests. In a second run on November 11, a stand-in answered one name lookup, one mentions read, one page and one transcript read with a 503. n8n asked each again, and the sheet got the same 74 rows.
- The agent prompt above ran once in Claude Sonnet 5.5 with the Arcmira MCP server on November 11, 2026, for Vercel and Netlify. 41 rows. Every quote is word for word in its transcript. 38 are a whole sentence, 1 is all a speaker said before the next one cut in, and 2 come from captions with no punctuation.

## Files

- [`competitor-mentions-sheet.n8n.json`](competitor-mentions-sheet.n8n.json): the workflow. Every HTTP node sends `x-arcmira-client: n8n-template/competitor-mentions-sheet`.
