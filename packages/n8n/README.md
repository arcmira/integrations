# Arcmira: YouTube Transcript Search for n8n

[Arcmira](https://arcmira.com) · [API documentation](https://arcmira.com/docs) · [OpenAPI](https://api.arcmira.com/v1/openapi.json)

Source preview 0.1.0. Native search and entity resolution have passed in official n8n 2.41.3. npm publication and n8n Cloud verification are pending.

Find who said what with timestamps, discover mentions across indexed YouTube videos, and separate sponsored ad reads from organic recommendations. Speaker labels have limited coverage. Results cover the indexed catalog, not every video on YouTube.

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

## Premium and errors

Selecting Arcmira Premium requires the corresponding entitlement. Premium and freshness refusals remain errors; this node never retries with captions, changes source, removes filters or upgrades the account. A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. Account limits apply. See [usage and billing](https://arcmira.com/docs/usage-and-billing). This node provides search and entity resolution; full transcript reads and monitor actions are available through the [SDKs](https://arcmira.com/docs/libraries) and [MCP server](https://arcmira.com/docs/mcp-server).

## Development

The official n8n-node CLI builds and lints this declarative node. Seven tests exercise n8n's real routing engine with fixture HTTP responses, including filters, source evidence, ambiguity, errors, credential redaction and redirect refusal. A contract check compares compiled node parameters with the repository's public OpenAPI subset.

On October 5, 2026, official n8n 2.41.3 ran authenticated search and entity resolution through the actual node. Both returned live evidence successfully. This covered basic free-account research, with no observed credit decrease and on-demand disabled. Paid filters and Premium access were not exercised.

Browser-editor validation, npm first publication with provenance, and n8n Creator Portal review remain. The package stays private and retains a publication guard until release setup is complete. The MIT adapter license does not change Arcmira service or content rights.
