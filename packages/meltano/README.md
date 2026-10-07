# Arcmira for Meltano

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

Export YouTube mentions and optional recommendation classifications for selected entities and a publication window. Records retain their source video, timestamps and analysis fields.

This is a locally tested Singer source preview. It is not on Meltano Hub or PyPI. A successful authenticated export remains unverified. Synthetic tap output has been loaded into target-duckdb 0.8.0 with DuckDB 1.5.5; other destinations remain unverified. A prior free-account run stopped at `403 filter_requires_paid` without emitting records or using credits. The tap keeps the requested filters when access is refused.

## Try the source

Use Python 3.11 or later. Local checks used Python 3.12.9, Singer SDK 0.54.6 and Meltano 4.3.0. The example project uses this directory as its source package.

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/packages/meltano
meltano install extractor tap-arcmira
export TAP_ARCMIRA_API_KEY='your-key'
meltano invoke tap-arcmira --discover
```

Before exporting, replace `entity_ids`, `after` and `before` in `meltano.yml` with your intended scope. Resolve entity names with the [API](https://arcmira.com/docs). `before` is exclusive. You can set `channel_id` to one channel and opt into `include_recommendations` if your account permits it. Keep credentials in the environment, outside the project file.

```sh
meltano invoke tap-arcmira > records.jsonl
```

The command makes live API reads. A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. Channel/date filters and recommendation access can require a paid plan. Review the [account usage controls](https://arcmira.com/docs/usage-and-billing) before running. Do not treat a failed run's output as a complete dataset.

## Export contract

The tap reads `GET /v1/mentions` and optionally `GET /v1/recommendations`. It does not retrieve full transcripts, search transcript passages, generate transcripts or change monitors. Commercial classifications are model-assisted observations, not proof of a sponsorship.

Each run starts a full-table read for the configured entities and window. Defaults allow ten pages of up to 100 records per entity per stream. The tap retains filters and account authentication when following opaque cursors. Repeated cursors, preview responses, malformed records and a page limit with more results remaining stop the run. HTTP errors stop without automatic retry or fallback. Request failures do not print the API key.

The output contains API-visible records in the configured scope, not a complete YouTube archive. Publication dates are not incremental state. Backfilled or edited records may change between runs; there is no transactionally consistent snapshot guarantee. Page-level index and coverage metadata are not emitted as Singer records. Keep the configuration with the resulting dataset to retain its scope.

A failed run may already have emitted records. In the tested target-duckdb 0.8.0 configuration with record validation enabled, a repeat run updated an existing `id` without duplicating it. A row omitted from that run remained in DuckDB. This is upsert behavior, not dataset replacement or deletion.

When the tap failed on a later page with HTTP 403, the target still committed the records already received and exited successfully. Check both process exits. For a shell pipeline, enable `set -o pipefail` before running it so a failed tap does not appear successful solely because the target exited zero. This propagates failure; it does not roll back destination writes. Use a separate staging destination and promote it only after a successful source run and verified completeness if partial results must not become visible.

These results cover one native target and configuration using synthetic API responses. Other targets and authenticated export remain unverified. Meltano 4.3.0 orchestration returned a nonzero exit for the same source refusal, but the destination still retained the partial row. Do not infer deletions or replace a dataset without a deliberate, tested target policy.

## Local checks

The 23 tests exercise the Singer CLI and source behavior with synthetic HTTP responses. They cover pagination, preserved records, recommendations, preview refusals, errors, page limits and configuration validation. No successful authenticated export is claimed. Meltano installation and discovery passed separately; the prior live checks covered invalid-key and paid-filter refusals only.

A separate native pipeline test connected the actual tap CLI to the unmodified [target-duckdb 0.8.0](https://github.com/jwills/target-duckdb) entrypoint, using DuckDB 1.5.5 and synthetic API responses. The first run stored two mentions and one recommendation, preserving nested entity/media JSON, timestamps and the recommendation quote. A repeat run and a later-page source refusal established the upsert and partial-commit behavior described above. These checks did not use a live Arcmira account.

The exact submitted Git package URL was installed remotely with the locked dependencies and build tools below. Installed metadata confirmed commit `41d8bb40ce8f02d62f2b6dcc15bfd0cf2eda67f2`, subdirectory `packages/meltano`, package version 0.1.0 and both discovery streams. The verified URL is:

```text
git+https://github.com/arcmira/integrations.git@41d8bb40ce8f02d62f2b6dcc15bfd0cf2eda67f2#subdirectory=packages/meltano
```

A separate Meltano 4.3.0 project ran the remotely installed tap and native target through custom fixture entrypoints. Only the HTTP responses were synthetic; source and target runtime code were unchanged. `meltano run` returned zero on success and repeat runs, and one on the later-page source refusal. The database still contained the partial row after failure, so checking the orchestrator exit does not replace staging or rollback policy.

```sh
uv venv --python 3.12 .venv
uv pip sync --python .venv/bin/python requirements-test.txt
.venv/bin/python check_schemas.py
.venv/bin/python -m pytest tests -q
.venv/bin/python -m hatchling build
```

The checked-in dependency audit records the tested versions and their release dates. `check_schemas.py` compares both record schemas against the included API 1.0.0 snapshot. CI runs these checks locally and never makes live API requests. `config.fixture.json` contains a synthetic key for offline discovery only.

Our remaining validation work is an authorized successful export and any additional destination or staging strategy. The synthetic native and orchestrated checks do not establish those behaviors. These are our verification gaps, not quoted Hub requirements. For catalog contribution, follow the [Meltano Hub guide](https://github.com/meltano/hub/blob/main/CONTRIBUTING.md). The Hub supports Git-based installation; a PyPI release is not required. The source preview uses Apache-2.0.
