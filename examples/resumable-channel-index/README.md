# Resumable YouTube channel index with Python and SQLite

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

Save indexed channel-video metadata and source links to SQLite. Each page and its continuation commit in the same transaction, so an interrupted import can resume from the last committed page. The example uses Python's standard library and requires Python 3.10 or later.

## Run one page

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/examples/resumable-channel-index
export ARCMIRA_API_KEY='your-key'
python3 resume_catalog.py episodes.sqlite \
    --channel-id UC-DRzaGnL_vtBUpCFH5M0tg \
    --after 2026-08-01 --before 2026-09-01 \
    --limit 5 --max-pages 1
```

Run the same command to continue. The channel-video route returns episode metadata, not transcript bodies. Transcript search does not support cursor pagination.

Keep the database with the same account and query. Changing the channel, dates or page size requires a different database in this example. The API can also invalidate a cursor when caller visibility changes or the token expires. An error stops the import without discarding its checkpoint; the example never silently restarts or changes the filters.

A paid read uses credits from your plan, then your on-demand budget. Page limits bound requests, not monetary cost. Plan restrictions can prevent pagination. See the usage guide for current metering and access rules.

## Inspect the saved sources

```sh
python3 - <<'PY'
import json
import sqlite3

with sqlite3.connect('episodes.sqlite') as db:
    for (document,) in db.execute('SELECT document FROM episodes ORDER BY video_id'):
        episode = json.loads(document)
        print(episode['title'], episode['watch_url'])
    print('Checkpoint:', db.execute('SELECT done FROM checkpoint').fetchone())
    for (metadata,) in db.execute('SELECT metadata FROM pages ORDER BY page_number'):
        page = json.loads(metadata)
        print('Returned window:', page['window'])
        print('Coverage:', page['note'])
PY
```

The `episodes` table keeps one row per video ID, updating a repeated video's metadata. The `pages` table preserves response metadata, including the effective window, coverage notes and continuation. `done=1` means the API reported no more results for this account-visible scope. It does not establish that every video on the channel or on YouTube was collected. Keep these databases private; they contain account-scoped responses and cursors.

## The transaction boundary

A page has two local effects: save its episodes and advance the checkpoint. Committing only one can lose data or cause repeat work. This example puts both effects in one SQLite transaction. A failed insertion or abrupt process exit rolls back that page; prior pages remain available.

This serializes local writers by holding the write transaction during the HTTP request. It is a small teaching example, not a high-concurrency importer. An API timeout or error propagates, and redirects are refused to avoid forwarding the credential to another host. The client performs no automatic retries.

Local recovery does not make remote requests exactly-once. A response received before a process crash may be requested again, and the repeated request may use credits. A fixed publication window also does not freeze a changing catalog. Keep the API's window and coverage notes with the saved results.

## Verification

```sh
python3 -m unittest -v test_resume_catalog.py
```

Six local tests use synthetic data. They cover a later-page network failure, reopening the database to resume the opaque cursor, duplicate-video updates, completed-run no-op, changed-query rejection, missing continuation, a failed insertion and an abrupt subprocess exit during insertion. No credentials or network requests are used by the tests.

On October 30, 2026, the example also completed two authenticated production channel-video requests with `limit=1`, reopening the database between requests. The first run stored one video; the second resumed the saved cursor and stored a second video. Both responses retained a continuation. This verifies bounded live pagination and process restart, not a complete channel export, expired-token recovery or high-concurrency behavior. API fields were checked against the public API document of October 30, 2026.
