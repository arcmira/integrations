"""A resumable local index of Arcmira channel-video metadata. Python 3.10+."""
import argparse
import json
import os
import sqlite3
import urllib.error
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def api_page(scope, cursor):
    key = os.environ['ARCMIRA_API_KEY']
    params = {k: scope[k] for k in ('after', 'before', 'limit')}
    if cursor is not None:
        params['cursor'] = cursor
    channel = urllib.parse.quote(scope['channel_id'], safe='')
    url = f'https://api.arcmira.com/v1/channels/{channel}/videos?{urllib.parse.urlencode(params)}'
    request = urllib.request.Request(url, headers={'Authorization': f'Bearer {key}'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        request_id = error.headers.get('X-Request-Id', 'unavailable')
        raise RuntimeError(f'API HTTP {error.code}; request id {request_id}; checkpoint unchanged') from None


def open_index(path, scope):
    db = sqlite3.connect(path)
    db.executescript('''
        CREATE TABLE IF NOT EXISTS checkpoint (
            singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
            scope TEXT NOT NULL, cursor TEXT, done INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS episodes (
            video_id TEXT PRIMARY KEY, document TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pages (
            page_number INTEGER PRIMARY KEY,
            metadata TEXT NOT NULL
        );
    ''')
    encoded = json.dumps(scope, sort_keys=True)
    with db:
        db.execute('INSERT OR IGNORE INTO checkpoint VALUES (1, ?, NULL, 0)', (encoded,))
    if db.execute('SELECT scope FROM checkpoint').fetchone()[0] != encoded:
        db.close()
        raise ValueError('This database belongs to another query; use a separate database.')
    return db


def collect(db, scope, fetch_page=api_page, max_pages=1):
    """Commit page data and cursor together; serialize concurrent local writers."""
    for _ in range(max_pages):
        try:
            db.execute('BEGIN IMMEDIATE')
            cursor, done = db.execute('SELECT cursor, done FROM checkpoint').fetchone()
            if done:
                db.rollback()
                return
            page = fetch_page(scope, cursor)
            episodes = page['episodes']
            more, next_cursor = page['has_more'], page['next_cursor']
            if not isinstance(episodes, list) or not isinstance(more, bool):
                raise ValueError('Invalid page shape; checkpoint unchanged.')
            if more and (not isinstance(next_cursor, str) or not next_cursor or next_cursor == cursor):
                raise ValueError('Missing or non-advancing cursor; checkpoint unchanged.')
            for episode in episodes:
                db.execute('INSERT INTO episodes VALUES (?, ?) ON CONFLICT(video_id) DO UPDATE SET document=excluded.document',
                           (episode['video_id'], json.dumps(episode)))
            metadata = {k: v for k, v in page.items() if k != 'episodes'}
            db.execute('INSERT INTO pages(metadata) VALUES (?)', (json.dumps(metadata),))
            db.execute('UPDATE checkpoint SET cursor=?, done=? WHERE singleton=1',
                       (next_cursor if more else None, int(not more)))
            db.commit()
        except BaseException:
            db.rollback()
            raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database')
    parser.add_argument('--channel-id', required=True)
    parser.add_argument('--after', required=True)
    parser.add_argument('--before', required=True)
    parser.add_argument('--limit', type=int, choices=range(1, 26), default=5)
    parser.add_argument('--max-pages', type=int, default=1)
    args = parser.parse_args()
    if args.max_pages < 1:
        parser.error('--max-pages must be positive')
    scope = {'channel_id': args.channel_id, 'after': args.after, 'before': args.before, 'limit': args.limit}
    db = open_index(args.database, scope)
    try:
        collect(db, scope, max_pages=args.max_pages)
        count = db.execute('SELECT count(*) FROM episodes').fetchone()[0]
        done = bool(db.execute('SELECT done FROM checkpoint').fetchone()[0])
        print(json.dumps({'stored_videos': count, 'complete_for_returned_scope': done}))
    finally:
        db.close()


if __name__ == '__main__':
    main()
