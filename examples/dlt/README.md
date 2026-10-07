# YouTube transcript search snapshots with dlt

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

Load a bounded Arcmira REST response into local JSONL files with dlt. Keep timestamped passages and the coverage notes that explain them. This is a first-party example using dlt's generic REST source, not a dlt verified-source catalog listing.

## Run one search

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/examples/dlt
uv sync --frozen
export ARCMIRA_API_KEY='your-key'
export RUNTIME__DLTHUB_TELEMETRY=false
uv run --frozen python arcmira_pipeline.py --query 'AI agents' --limit 5 --output output
```

The default is one request with at most five search chunks. Search has no cursor and is not an exhaustive transcript export. To keep an explicit quality or date filter, add `--source arcmira_premium`, `--after 2026-08-01`, or `--before 2026-09-01`. A refused filter stops the run; the example never removes it or substitutes another transcript source.

A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. The API currently meters search chunks and channel videos past the first five returned at four credits each. Increasing `--limit` or running more pages can use credits. The request and page limits bound extraction size; they are not an account budget control. See the [usage guide](https://arcmira.com/docs/usage-and-billing) for the current rules.

## Read the local result

Each row has a `response` JSON object containing the complete API response. The search table is `output/arcmira/search_pages/`. dlt adds its own load and row IDs.

```sh
uv run --frozen python - <<'PY'
import gzip
import json
from pathlib import Path

for path in Path('output/arcmira/search_pages').glob('*.jsonl*'):
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(path, 'rt') as file:
        for line in file:
            response = json.loads(line)['response']
            for chunk in response['chunks']:
                print(chunk['text'], chunk['watch_url'])
            print(response['note'])
PY
```

Empty results still produce a response row with the coverage note. They do not prove that nobody discussed the topic. Nested source labels, timestamps, filters, account windows and index status remain in the response object.

Each successful run appends a snapshot. Repeating a query can add duplicate results; this example does not implement incremental synchronization or deduplication. Use a separate output directory for each export if you want distinct snapshots.

## Read bounded channel pages

Channel-video listings support opaque cursor pagination. Use a YouTube channel ID, not a name:

```sh
uv run --frozen python arcmira_pipeline.py \
    --channel-id UC-DRzaGnL_vtBUpCFH5M0tg \
    --after 2026-08-01 --before 2026-09-01 \
    --limit 5 --max-pages 2 --output channel-output
```

This writes at most two response rows to `channel-output/arcmira/channel_pages/`, one per API page. The cursor, date filters, page size and credential stay consistent. Pagination stops at the API's end or the requested page cap. If the last saved response has `has_more: true`, the export is incomplete; its `next_cursor` is retained. This script does not resume cursors across runs. The listing contains episode metadata and source links, not full transcript bodies.

## Handle a refusal

An authentication, access, quota, cursor or rate error stops extraction. The exception retains the HTTP response body, status, request ID and `Retry-After` header. Automatic HTTP retries are disabled. Resolve the error before rerunning; do not widen the query or drop a requested source filter to get a successful response.

Extraction must finish before loading starts, so a failed later page does not load a partial snapshot into the destination. dlt can keep diagnostic or recovery state under the output's `.pipeline` directory. Treat that directory and the response files as account data. Keep keys in the environment, outside source files.

## Verification

```sh
RUNTIME__DLTHUB_TELEMETRY=false uv run --frozen python -m unittest discover -s test -v
```

Eight local tests run the real dlt REST transport, extraction, normalization and filesystem loader against a fixture HTTP server. They cover full and empty search responses, opaque cursors, page bounds, preserved filters, refused reads, unexpected responses and a later-page failure. Fixtures follow the deployed OpenAPI contract checked on October 5, 2026. Tests use no live credentials or paid requests.

The lockfile uses dlt 1.30.0 and Python 3.12 with dependencies released before September 28, 2026.

On October 5, 2026, this unchanged example also completed one authenticated production search on a Free account with `--limit 1`. The real dlt pipeline loaded one response into local JSONL and preserved its timestamped passage, source label, watch URL and coverage information. Account usage and available credits stayed unchanged; on-demand usage was disabled.

That live check covers one search and the filesystem destination. Channel pagination, paid source filters and Premium reads were not exercised against a live account. Results depend on current index coverage and account access.

[dlt REST source configuration](https://dlthub.com/docs/dlt-ecosystem/verified-sources/rest_api/basic) · [dlt filesystem destination](https://dlthub.com/docs/dlt-ecosystem/destinations/filesystem)
