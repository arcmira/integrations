# Find YouTube clips by topic and export a CSV with Arcmira

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [MCP setup](https://arcmira.com/docs/mcp-server)

Turn a topic into up to five timestamped passages for a video or research project. This n8n workflow exports a CSV with each passage, channel, video title, source links and coverage notes. It uses built-in nodes and needs no model connection.

## Run it

1. Download [the workflow JSON](arcmira-clip-shortlist.n8n.json) and import it into n8n using **Import from File**.
2. In **Search transcripts**, select an **HTTP Header Auth** credential. Set the header name to `Authorization` and its value to `Bearer YOUR_ARCMIRA_API_KEY`. Create your key in [Arcmira](https://arcmira.com); keep it in n8n credentials, never in the exported workflow.
3. Set your topic in **Set research topic**. The example uses `vibe coding`.
4. Execute the workflow and inspect the search response. Download `arcmira-clip-shortlist.csv` from **Export clip shortlist**.
5. Watch each source and mark the passages you want to use. Timestamps locate passages; choose exact edit boundaries after playback.

The workflow makes one search request with `limit=5`. It starts manually and has no pagination or automatic retries. Account access and indexed coverage determine results. Requests use your account allowance; see [usage and billing](https://arcmira.com/docs/usage-and-billing).

The CSV preserves complete returned passages and available speaker labels, plus the publication window, freshness and coverage notes. Speaker labels can be absent. Errors stop execution; an empty search does not produce a misleading empty export. The workflow does not download footage or establish reuse rights.

## Verification

The workflow was imported and executed in n8n 2.41.3 on October 13–14, 2026. A fixture execution produced a checked CSV, and one authenticated live execution exported five source-linked passage rows. These bounded checks do not establish results for every query or account. No credentials, execution records or live transcript excerpts are included.

Packaging removes only the local workflow identifier and empty pinned-data object. Nodes and connections match the tested export. Run `node examples/n8n-clip-shortlist/check.mjs` from the repository root to check the mapping behavior and credential-free packaging.

The [three-result JSON example](../n8n-source-shortlist) provides a different output format and explicit date inputs. This CSV example is an importable workflow; publication in n8n's template catalog is separate.

## License

Apache-2.0 under the repository [license](../../LICENSE). This license covers the workflow and instructions, not third-party media or transcripts.
