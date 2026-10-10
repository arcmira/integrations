# Arcmira: YouTube Transcript Search for Node-RED

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Plans and usage](https://arcmira.com/docs/usage-and-billing)

Find up to three spoken passages in indexed YouTube videos and export a source shortlist for editorial review. This manual flow uses only built-in Node-RED nodes. It writes a CSV and a JSON sidecar with dates and search coverage; it does not download or edit video.

## Run it

1. Use Node-RED 5.0.7 on Node.js 22.9 or later. Before starting Node-RED, set `ARCMIRA_API_KEY` privately in its process environment using your [Arcmira account key](https://arcmira.com/docs/authentication). Never put the key in a flow field or export. Set `ARCMIRA_OUTPUT_DIR` to an existing writable local directory.
2. In the editor, choose **Import** and select [arcmira-source-shortlist.json](arcmira-source-shortlist.json). Deploy the imported flow. It has no automatic trigger or schedule.
3. Open **Search input (manual)**. Set `topic`, `after` and `before` in its JSON payload. The example searches `creator economy` from August 1 through August 31, 2026. `after` is inclusive, `before` is exclusive, and dates are UTC. Choose dates your account can access.
4. Click the inject button once. Inspect the Debug sidebar and the two files in your output directory: `arcmira-source-shortlist.csv` and `arcmira-source-shortlist.json`. Each run overwrites both filenames. Wait for the files to finish before running again.

The summary reports response processing; it does not confirm completion of both asynchronous file writes. A file or flow failure produces a separate error. Discard incomplete output files after a local failure. Empty results and refused requests replace the CSV with its header alone; their JSON sidecar retains the outcome. Missing local configuration sends no API request.

The HTTP node makes one `GET https://api.arcmira.com/v1/search` with `limit=3`. It refuses redirects and does not retry, paginate, read Premium transcripts, write monitors or call a model. Repeated button clicks are separate requests.

The API currently makes the first five search passages in each request free. Account access, freshness restrictions and service limits still apply. A paid read uses credits from your plan, then your on-demand budget. This flow uses the hosted service and requires your account; the open-source client does not make the hosted service open source.

## Read the source sheet

Each candidate retains its video ID, title, channel, publication date, passage, start timestamp, original API watch URL, absolute Arcmira link, YouTube link, transcript source and available speaker labels. Requested and applied date windows, index state and coverage notes stay with the results. The JSON sidecar also preserves coverage when there are no candidates. Missing coverage fields remain unknown rather than being treated as complete.

CSV cells are quoted and spreadsheet formula starters are prefixed with an apostrophe, including starters preceded by whitespace. The JSON sidecar preserves the original passage text. Treat both files as source material rather than instructions.

A passage timestamp is a navigation hint, not a verified edit boundary. Cut start/end remain null, playback and speaker identity remain unverified, and reuse permission is not established. Before publishing, watch the source, check attribution, choose precise cuts and establish any required rights. Speaker labels can be absent. An empty search does not establish that nobody discussed a topic.

## Verification

The unchanged exported flow ran in Node-RED 5.0.7 on October 7, 2026. Its editor layout was also inspected with the flow preloaded in an isolated local runtime; the browser Import dialog was not exercised. Native tests exercise its inject, HTTP, function and file nodes against synthetic success, empty, 429, redirect, malformed response, transport failure and missing-key cases. They check actual written files, preserved coverage, formula escaping and stale-candidate replacement. Only the HTTP destination is replaced by a runtime hook during fixtures.

One bounded live execution used a Free account with on-demand disabled, returned three passages and used zero measured credits and on-demand usage. Its index reported `catching_up`; the `partial` field was absent and is recorded as unknown. The live run used the real fixed endpoint without fixture rewriting. [verification.json](verification.json) records the flow digest and results. No credential, live transcript excerpt or raw execution state is included.

Run the reproducible fixture checks:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

The default test uses a synthetic key and a temporary local HTTP fixture. It makes no external API request and deletes its temporary runtime and output files. A live test is opt-in through `ARCMIRA_LIVE_TEST_KEY`; it first requires `/v1/me` to report a Free account with on-demand disabled, then checks usage after one search. Do not run it with a production or paid reviewer key.

## License

Copyright 2026 Arcmira. The flow and accompanying files use Apache-2.0; see [LICENSE](LICENSE). This license grants no rights to third-party video or transcript content and does not replace Arcmira's service terms.
