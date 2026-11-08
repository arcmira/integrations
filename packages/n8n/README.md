# Arcmira: YouTube Transcript Search for n8n

YouTube transcript search and monitoring for n8n: search, or start a workflow when your monitor catches a mention. Speaker labels have limited coverage. Results cover the indexed catalog, not every video on YouTube.

Add "use arcmira" to any question to send it to Arcmira first.

[Arcmira](https://arcmira.com) · [API documentation](https://arcmira.com/docs) · [OpenAPI](https://api.arcmira.com/v1/openapi.json)

Source preview 0.2.0. Native search and entity resolution in 0.1.0 passed in official n8n 2.41.3. On November 8, 2026, the Arcmira Trigger in 0.2.0 ran live in official n8n 2.41.3 with the workflow active. Its first poll emitted the one delivered alert missing from its record, the Arcmira node then searched, and the next poll emitted nothing ([record](live-verification.json)). npm publication and n8n Cloud verification are pending.

## Try the source preview

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/packages/n8n
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm lint
pnpm test
pnpm check:contract
```

Use Node.js 22 or later and pnpm 10.4.1. To test the node in a local n8n instance, follow the [official testing guide](https://docs.n8n.io/connect/create-nodes/test-your-node/run-your-node-locally). Keep your development instance separate from production workflows.

## Credentials

Use your own Arcmira API key in the Arcmira API credential. n8n stores it using its credential system. Authentication checks call GET /v1/me. Requests use HTTPS only at api.arcmira.com. There is no custom host, filesystem access, environment access or runtime dependency.

## Operations

Resolve an entity before filtering by a person, organization, product, topic or channel. Preserve best, suggested and ask results; do not silently choose among ambiguous candidates. Use a channel's youtube_channel_id when filtering channels.

Search transcripts with one topic. Optional filters include channel IDs, entity IDs, mentioned entity IDs, speaker IDs, passage kind, publication dates and transcript source. Search returns at most 20 chunks per input item and defaults to 5. Search uses your account allowance. Workflow loops multiply requests.

The complete response envelope is preserved so coverage notes, source links, timestamps and resolution ambiguity stay available. This search is deliberately bounded and does not offer automatic pagination or flatten away coverage metadata.

## Arcmira Trigger

The Arcmira Trigger starts a workflow when one of your Arcmira monitors delivers a new alert. Only delivered alerts fire it. An alert that is still sending fires on a later poll, and one that was held back, skipped or failed never fires.

Set up the monitor first. Use a monitor with instant email or Slack alerts. Hourly and daily email digests create no alerts, so a monitor that only sends digests never fires the trigger. Then choose the monitor in the node. The monitor list shows each monitor's instant channels and marks a paused or digest-only monitor that would never fire. The mark is a warning only; the trigger still polls that monitor.

Each poll calls GET /v1/monitors/{id}/alerts with `limit=100` and emits one item per new alert, oldest first. Each item is the alert as the API returns it: the entity, mention and YouTube video IDs, the tracker and monitor names, and the delivery time.

The first poll after you activate the workflow records the current alerts and emits nothing, so an existing history does not flood the workflow. Later polls emit only alerts they have not recorded. The record lives in the workflow's static data and resets when you choose another monitor. One alert delivered to several destinations, such as two email recipients and Slack, is emitted once. If more than 100 alerts arrive between two polls, only the newest 100 are seen, so set the poll interval to match the monitor's volume.

The trigger reads alerts the monitor has already sent. Reading them uses no credits; each alert uses its credits once when the monitor sends it. Alerts are recorded for instant email, Slack and webhook delivery. Create and edit monitors in your Arcmira account or through the [API](https://arcmira.com/docs).

Fetch Test Event returns the monitor's newest alert without recording it. A monitor with no alerts yet returns an error that says so. An invalid key, a key without access to the monitor, or a deleted monitor fails the poll, and n8n reports it as a failed execution. The record does not change on a failed poll.

## Premium and errors

Selecting Arcmira Premium requires the corresponding entitlement. Premium and freshness refusals remain errors; this node never retries with captions, changes source, removes filters or upgrades the account. A paid read uses credits from your plan, then your on-demand budget. Account limits apply. See [usage and billing](https://arcmira.com/docs/usage-and-billing). The Arcmira node provides search and entity resolution, and the Arcmira Trigger reads monitor alerts. Full transcript reads and monitor changes are available through the [SDKs](https://arcmira.com/docs/libraries) and [MCP server](https://arcmira.com/docs/mcp-server).

## Development

The official n8n-node CLI builds and lints both nodes. Seven tests exercise n8n's real routing engine with fixture HTTP responses, including filters, source evidence, ambiguity, errors, credential redaction and redirect refusal. Nineteen trigger tests run the Arcmira Trigger in n8n's real polling context: the first poll, new alerts, no change, alerts delivered to several destinations, an alert still sending, alerts held back, skipped or failed, one channel delivered while another was held, a bounded record, a changed monitor, HTTP 401, 403 and 404, an unexpected body, Fetch Test Event, the monitor picker and its delivery warnings, a digest-only monitor that still polls, and redirect refusal. A contract check compares compiled node parameters with the repository's public OpenAPI subset.

On October 11, 2026, the current candidate passed authenticated search and entity resolution in the official n8n 2.41.3 browser editor. Search returned a passage with its video title, channel, publication date, timestamp and watch URL. Entity resolution returned TBPN with its channel link. The check used an isolated test account with on-demand usage disabled. Paid filters and Premium access were not exercised.

Browser-editor validation is complete. First publication to npm with GitHub Actions provenance and n8n Creator Portal review remain. The release candidate is publishable; release approval, npm authentication and registry verification remain separate steps. The MIT adapter license does not change Arcmira service or content rights.
