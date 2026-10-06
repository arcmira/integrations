# Arcmira source for Airbyte

[API docs](https://arcmira.com/docs) · [Usage and billing](https://arcmira.com/docs/usage-and-billing) · [Existing connector proposal](https://github.com/airbytehq/airbyte/discussions/87666)

Export explicitly scoped YouTube channel videos, entity mentions and commercial recommendations from Arcmira's indexed API.

This is a locally tested Python CDK source preview, version 0.1.0. A local custom connector image is available to build. It is not a published registry image, accepted catalog connector or published Python package. It passed a local Airbyte 2.3.0 platform sync with synthetic data. Live authenticated export remains unverified.

## Run locally

Use Python 3.12. The lock pins Airbyte CDK 7.31.0 and its dependencies. The release-age audit is included.

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements.lock
.venv/bin/python source_arcmira.py spec
.venv/bin/python source_arcmira.py discover --config config.json
.venv/bin/python source_arcmira.py check --config config.json
.venv/bin/python source_arcmira.py read --config config.json --catalog catalog.json
```

Use the Airbyte configured catalog returned by your host or construct it from `discover`, with `sync_mode: full_refresh`. `config.fixture.json` contains a deliberately nonfunctional synthetic key. Keep your actual `config.json` outside version control. The API key is a secret in the connector specification. The API origin is fixed and redirects are refused.

`check` validates configuration and calls only `/v1/me`. It does not prove access to every configured stream. Sync preserves permission and quota errors, including Pro+ requirements for recommendations and full mention details.

## Build a custom connector image

From this directory, use Docker to build the local image:

```sh
./build-container.sh
docker run --rm arcmira/source-arcmira:0.1.0-local spec
docker run --rm -v "$PWD/config.json:/config.json:ro" \
  arcmira/source-arcmira:0.1.0-local discover --config /config.json
docker run --rm -v "$PWD/config.json:/config.json:ro" \
  arcmira/source-arcmira:0.1.0-local check --config /config.json
docker run --rm -v "$PWD/config.json:/config.json:ro" \
  -v "$PWD/catalog.json:/catalog.json:ro" \
  arcmira/source-arcmira:0.1.0-local read --config /config.json --catalog /catalog.json
```

The build uses Airbyte's Python connector base 4.1.1, pinned by its multi-platform digest. It downloads only wheels from the existing hash-locked dependency list, then installs them with networking disabled into an isolated virtual environment. It does not run apt, update dependencies or copy local credentials into the image. The final image runs as the `airbyte` user. To reuse downloaded wheels, set `ARCMIRA_AIRBYTE_WHEELHOUSE` to their directory. Installation still verifies their hashes.

The ARM64 image was tested with Python 3.13.14 and CDK 7.31.0. Its actual entrypoint passed `spec`, three-stream `discover`, successful and refused `check`, and paginated `read` through synthetic HTTP responses with networking disabled. A successful read emitted six records. A later-page HTTP 403 emitted five records and returned exit 1 with the API error intact. A refused connection check returned protocol status `FAILED` with exit 0, as the CDK check command specifies. Inspect the protocol status as well as process exits.

This follows Airbyte's [custom Dockerfile build option](https://docs.airbyte.com/platform/connector-development/testing-connectors/connector-acceptance-tests-reference). That option is not supported for certified connectors. Airbyte's preferred catalog build requires its generated template and `metadata.yaml`; migrating to that packaging remains pending. AMD64 execution, registry publication and official acceptance tests are unverified. The synthetic tests did not authenticate to Arcmira or consume usage.

## Choose the scope

Configure any combination of these arrays. An absent or empty array disables its stream.

- `channel_videos`: each scope requires a YouTube `channel_id`. Optional `after` and `before` filters select the publication window.
- `mentions`: each scope requires an `entity_id`. Optional channel, text query, sentiment, appearance flag, date window and `details: full` filters match the API. Appearance filters are only valid for person entities; the API enforces this.
- `recommendations`: each scope requires an `entity_id`. Optional channel, commercial class, confidence, date window and disputed-result filters match the API. Recommendations require Pro+.

Resolve names to IDs with the API before configuring a scope. Dates use the API's half-open interval: `after` inclusive and `before` exclusive. Timestamps require a timezone. Do not use publication dates as ingestion watermarks. Omitted filters retain the API defaults, including the recommendation confidence threshold of 0.7 and exclusion of disputed classifications.

## Completeness and metered usage

A full refresh exports the currently indexed data visible to this account within the configured scope. It is not a complete export of YouTube or a historical archive. The API's first-page fence excludes newly inserted rows from that page sequence, including old-date backfills. Existing-row edits and deletions remain live, so the sequence is not a transactionally consistent snapshot.

Each new sync starts from page one. No continuation token is persisted as incremental state. A later refresh can include backfills and edits and reflect deletions. Prefer full-refresh overwrite for a current scoped snapshot. Append creates repeated records across refreshes and does not represent deletions. Overlapping scopes are intentionally separate and have separate scope IDs.

A paid read uses credits from your plan, then your on-demand budget. The configured budget is approval. A full refresh or retry may consume additional usage. The connector does not lift gates, change filters, request transcripts, invoke backfill, change account settings or substitute lower-quality results.

API row fields remain intact. `_arcmira` adds the exact scope, a stable scope ID and response window. Channel rows also retain `indexed_through`, `index_age_days`, `as_of` and the API note. Empty channel responses are valid and do not trigger backfill; index context is logged even when there are no records.

## Failure behavior

Preview, unlock, partial and unfamiliar access/coverage envelopes fail the affected stream and mark the sync unsuccessful. The CDK can continue reading other configured streams. Mentions/recommendations with preview notes stop before page records are emitted. Channel notes are informational, are retained and do not imply a preview. The connector validates each response and all rows against the captured released schema before emitting the page. Missing required fields, inconsistent pagination, count mismatches and repeated cursors fail visibly.

Within one source attempt, HTTP 402 and 403 stop without retry or a scope fallback. Airbyte can independently retry the entire sync according to its platform policy. HTTP 429, server failures and transport errors share one limit of three retries per page. A successful page resets that limit. Error diagnostics reset for every response or transport failure and every new read, so a prior rate-limit error cannot replace a later network error. The framework retry window is 120 seconds; individual requests have a 10-second connection timeout and a 60-second read timeout, so this is not a strict total sync deadline. `Retry-After` is honored up to 60 seconds. Longer or malformed waits fail instead of retrying early. Error traces retain HTTP status, API type, code, gate and request ID when provided. URLs in an error are not followed.

Airbyte streams records as it reads them. A later page can fail after earlier records were emitted. Treat that run as incomplete; the connector does not promise an atomic destination rollback.

A native source CLI-to-destination protocol test used the official `airbyte/destination-duckdb:0.6.0` ARM64 image at digest `sha256:dce7cfb77edefd252adcb848a4656b14c6e110d6888d554e239b73388547b519`. Its runtime contains DuckDB 1.4.2 and Airbyte CDK 0.51.44. Synthetic HTTP responses passed through this source's unchanged CLI into the network-disabled destination container. The complete protocol stream was forwarded, including logs, states and error traces.

| Case | Source / destination exit | Observed destination data |
| --- | --- | --- |
| Initial overwrite | 0 / 0 | Two records in each stream |
| Repeated overwrite | 0 / 0 | One updated record per stream; omitted records removed |
| Append | 0 / 0 | Two copies of the repeated record per stream |
| Overwrite with a later-page HTTP 403 | 1 / 0 | Partial mentions replaced prior mentions; other streams continued and wrote records |

Every stored JSON payload matched its source record, including `_arcmira` scope/window metadata and research fields. A successful destination exit did not establish source success, and overwrite was not atomic. Check the source outcome and use an independently verified staging/promotion policy when incomplete replacement data must not become visible.

The DuckDB checks above exercised the CLI protocol. A separate local ARM64 Airbyte 2.3.0 platform sync used the unchanged source runtime with synthetic HTTP responses and the official built-in Postgres 3.0.22 destination. The platform completed source/destination checks, discovery and replication. Direct database queries verified two channel videos, two mentions and two recommendations, with every expected source field preserved, including timestamps, citations and `_arcmira` context. The run used no real Arcmira credentials or credits.

A second platform check sent a synthetic HTTP 403 on a later mentions page into a separate, initially empty Postgres schema. Airbyte marked the job failed after five automatic whole-sync attempts. The source exited 1 while the destination and orchestrator exited 0. Direct database queries found zero records in all three destination tables, and the connection had no saved state. The separate successful test schema retained its two records per stream. This test used no real Arcmira credentials or credits.

This small, initially empty-destination failure test does not establish atomic overwrite of existing data, rollback after larger committed batches or general staging/commit guarantees. Other platform/destination combinations and a live authenticated export remain unverified. Check the platform job outcome as well as individual process exits. Whole-sync retries may repeat metered reads.

## Validation and release work

```sh
.venv/bin/python generate_schemas.py --check
.venv/bin/python -m pytest test_source.py -q
```

All 58 tests pass using synthetic HTTP fixtures through the actual Airbyte CDK transport and source-read protocol. They cover all streams, cursor propagation, filters, schema preservation, empty pages, gate and preview failures, retry exhaustion, mixed HTTP/transport failures, reused streams, redirection, multiple scopes, old-date backfills, edits and deletion refreshes. No real API credentials are included or used.

A declarative `DefaultErrorHandler` predicate was also tested and can reject an unlock envelope before extraction. This candidate uses a supported Python `HttpStream` so whole-envelope validation, cursor-cycle detection and typed final errors are explicit and tested.

Before a production connector release: validate it in an approved Airbyte host against a dedicated sandbox, run the required connector acceptance tests and verify the chosen platform/destination commit policy. The native destination test above does not establish those platform guarantees. The existing [connector proposal](https://github.com/airbytehq/airbyte/discussions/87666) is the coordination point. See the [official contribution requirements](https://docs.airbyte.com/platform/connector-development/submit-new-connector).

## Included contract and repository checks

`openapi.json` is the public API schema 1.0.0 captured October 5, 2026. Its SHA-256 is `b244f4940f265fe4ab5ebad910020a5447865cf380db1e774bbdf73a8a008af5`. The spec version is separate from SDK, MCP and connector versions. `generate_schemas.py --check` verifies the connector specification and six response/record schemas against this included snapshot without changing files.

From the repository root, `ARCMIRA_AIRBYTE_PYTHON=/absolute/path/to/existing/python ./scripts/ci.sh --offline` runs all local integration checks with cached dependencies and this existing Airbyte environment. Without the override, Airbyte checks use `packages/airbyte/.venv/bin/python`. The script does not create the Airbyte environment. Offline mode forbids dependency downloads and fails on a cache miss; it does not skip builds or tests.

The unit tests mock HTTP responses through the native CDK transport and read protocol. The separate destination checks above exercise an official destination container. The custom source image has the separate ARM64 checks described above. The local ARM64 platform sync above used synthetic responses. Live authenticated Arcmira export, AMD64 execution, overwrite/commit guarantees beyond the cases above and the connector acceptance suite remain unverified. This source preview is not an Airbyte catalog release.
