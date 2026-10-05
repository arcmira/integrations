# Arcmira source for Airbyte

[API docs](https://arcmira.com/docs) · [Usage and billing](https://arcmira.com/docs/usage-and-billing) · [Existing connector proposal](https://github.com/airbytehq/airbyte/discussions/87666)

Export explicitly scoped YouTube channel videos, entity mentions and commercial recommendations from Arcmira's indexed API.

This is a locally tested Python CDK source preview, version 0.1.0. It is not an installable Airbyte host artifact, accepted catalog connector or published Python package. It has not run in a deployed Airbyte host.

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

Preview, unlock, partial and unfamiliar access/coverage envelopes stop the sync. Mentions/recommendations with preview notes stop before page records are emitted. Channel notes are informational, are retained and do not imply a preview. The connector validates each response and all rows against the captured released schema before emitting the page. Missing required fields, inconsistent pagination, count mismatches and repeated cursors fail visibly.

HTTP 402 and 403 stop without retry or a scope fallback. HTTP 429, server failures and transport errors share one limit of three retries per page. A successful page resets that limit. Error diagnostics reset for every response or transport failure and every new read, so a prior rate-limit error cannot replace a later network error. The framework retry window is 120 seconds; individual requests have a 10-second connection timeout and a 60-second read timeout, so this is not a strict total sync deadline. `Retry-After` is honored up to 60 seconds. Longer or malformed waits fail instead of retrying early. Error traces retain HTTP status, API type, code, gate and request ID when provided. URLs in an error are not followed.

Airbyte streams records as it reads them. A later page can fail after earlier records were emitted. Treat that run as incomplete; the connector does not promise an atomic destination rollback. Validate overwrite/failure behavior in the chosen destination before production use.

## Validation and release work

```sh
.venv/bin/python generate_schemas.py --check
.venv/bin/python -m pytest test_source.py -q
```

All 58 tests pass using synthetic HTTP fixtures through the actual Airbyte CDK transport and source-read protocol. They cover all streams, cursor propagation, filters, schema preservation, empty pages, gate and preview failures, retry exhaustion, mixed HTTP/transport failures, reused streams, redirection, multiple scopes, old-date backfills, edits and deletion refreshes. No real API credentials are included or used.

A declarative `DefaultErrorHandler` predicate was also tested and can reject an unlock envelope before extraction. This candidate uses a supported Python `HttpStream` so whole-envelope validation, cursor-cycle detection and typed final errors are explicit and tested.

Before publication: review the candidate, validate it in an approved Airbyte host against a dedicated sandbox, run the required connector acceptance tests and verify destination overwrite behavior. The existing [connector proposal](https://github.com/airbytehq/airbyte/discussions/87666) is the coordination point. The official Python contribution route permits a PR after discussion and testing; the Builder route asks for a classic GitHub token with broad scopes, which has not been granted. The source preview is available for review; no duplicate proposal, host package or catalog submission accompanies it. See the [official contribution requirements](https://docs.airbyte.com/platform/connector-development/submit-new-connector).

## Included contract and repository checks

`openapi.json` is the public API schema 1.0.0 captured October 5, 2026. Its SHA-256 is `b244f4940f265fe4ab5ebad910020a5447865cf380db1e774bbdf73a8a008af5`. The spec version is separate from SDK, MCP and connector versions. `generate_schemas.py --check` verifies the connector specification and six response/record schemas against this included snapshot without changing files.

From the repository root, `ARCMIRA_AIRBYTE_PYTHON=/absolute/path/to/existing/python ./scripts/ci.sh --offline` runs all local integration checks with cached dependencies and this existing Airbyte environment. Without the override, Airbyte checks use `packages/airbyte/.venv/bin/python`. The script does not create the Airbyte environment. Offline mode forbids dependency downloads and fails on a cache miss; it does not skip builds or tests.

The unit tests mock HTTP responses through the native CDK transport and read protocol. They do not validate a Docker image, deployed scheduler, live Arcmira sync, destination behavior or Airbyte's connector acceptance suite. Those remain required before claiming a production connector.
