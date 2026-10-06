# Arcmira: YouTube Transcript Search for Pipedream

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Action guide](components/arcmira) · [Existing app request](https://github.com/PipedreamHQ/pipedream/issues/22142)

**Locally tested source preview.** These three native actions search timestamped YouTube transcript passages, resolve entities and list channel sponsors. They are not a hosted Pipedream app, published Connect custom tools or an installable registry listing.

The target is Pipedream Connect and MCP. Workflows and String stop operating on March 31, 2027. New Workflows signups are closed. See the [supported route and host-testing prerequisites](components/arcmira#connect-and-mcp-testing-route).

## Run the local checks

Use Node.js 22 or later. No Pipedream or Arcmira credentials are needed.

```sh
cd packages/pipedream
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run validate
```

The 22 fixture tests exercise the real native action modules and Pipedream platform HTTP wrapper with synthetic Axios responses. A socket guard rejects any attempt to access the network. Tests cover complete response envelopes, ambiguous entities, source and filter preservation, bounded requests, structured refusals, malformed responses, redaction, redirects and connection permissions. They do not exercise Pipedream's managed authentication, hosted execution or registry discovery.

The local validator checks component shape, JavaScript syntax and parameter parity with the included public OpenAPI snapshot. Run `./scripts/ci.sh` from the repository root to check all integrations.

Separately, these components pass Pipedream's unchanged [official ESLint configuration](https://github.com/PipedreamHQ/pipedream/blob/3a8a9cfe945ba4d80edf8631ab498732a719e26a/eslint.config.mjs) with zero errors or warnings, plus its key, app-property and duplicate-key checks scoped to this app. The isolated lint environment pins the upstream direct tool versions but resolves some transitive dependencies differently. This is not full upstream catalog CI or hosted validation; the local commands above do not run those upstream checks.

## Before host testing

Pipedream must confirm the managed `arcmira` app slug and secret `api_key` field. The [auth handoff](app-auth-handoff.json) is a proposal, not an importable or registered app definition. The included SVG is the proposed app icon. Follow existing request #22142 rather than opening a duplicate.

Private Connect custom-tool publishing requires a Business plan. Ask for a first-party contributor testing route or confirm an existing entitlement before a paid upgrade. Then validate the managed connection, all three actions, refusal exports and MCP discovery in the actual host. No host tests or live authenticated Arcmira calls have run for this preview.

A paid read uses credits from your plan, then your on-demand budget. Each action makes one bounded read and preserves account restrictions, explicit source choices and complete coverage metadata. It never retries automatically or substitutes a lower-quality source after refusal.

## Snapshot and dependencies

`test/fixtures/openapi.json` is the public API schema 1.0.0 fetched on October 5, 2026 from [the deployed OpenAPI endpoint](https://api.arcmira.com/v1/openapi.json). Schema versions are separate from SDK and MCP versions. Its SHA-256 is `b244f4940f265fe4ab5ebad910020a5447865cf380db1e774bbdf73a8a008af5`.

`package-lock.json` pins `@pipedream/platform` 3.1.1 and all transitive dependencies. All 34 package versions met the seven-day release-age policy on October 5, 2026. Runtime modules use direct HTTP rather than an Arcmira SDK. Both package manifests remain private; no npm release is proposed. Source is Apache-2.0 licensed.
