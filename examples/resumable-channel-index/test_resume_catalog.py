"""Synthetic page tests. No network calls or credentials."""
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from resume_catalog import collect, open_index

SCOPE = {'channel_id': 'UC' + 'x' * 22, 'after': '2026-08-01', 'before': '2026-09-01', 'limit': 2}


def episode(video_id, title='Synthetic fixture'):
    return {'video_id': video_id, 'title': title, 'published_at': '2026-08-15T00:00:00Z',
            'duration_seconds': None, 'view_count': None, 'channel_id': SCOPE['channel_id'],
            'channel_name': 'Synthetic channel', 'channel_page': None,
            'watch_url': f'https://arcmira.com/watch?v={video_id}'}


def page(episodes, next_cursor=None):
    return {'episodes': episodes, 'returned': len(episodes), 'has_more': next_cursor is not None,
            'next_cursor': next_cursor, 'channel': {'id': None, 'youtube_channel_id': SCOPE['channel_id'], 'name': 'Synthetic channel', 'page': None},
            'window': {'after': '2026-08-01T00:00:00Z', 'before': '2026-09-01T00:00:00Z'},
            'indexed_through': '2026-08-15T00:00:00Z', 'index_age_days': 76, 'as_of': '2026-08-15T00:00:00Z',
            'note': 'Synthetic data for crash recovery tests; not an API capture.'}


class ResumeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = str(Path(self.temp.name) / 'catalog.sqlite')
        self.db = open_index(self.path, SCOPE)
        self.addCleanup(lambda: self.db.close())
        self.addCleanup(self.temp.cleanup)

    def test_resume_after_network_failure_and_preserve_metadata(self):
        calls = []
        def fetch(scope, cursor):
            calls.append(cursor)
            if cursor is None:
                return page([episode('aaaaaaaaaaa')], 'opaque:+/token=')
            raise TimeoutError('simulated network interruption')
        with self.assertRaises(TimeoutError):
            collect(self.db, SCOPE, fetch, max_pages=2)
        self.db.close()
        self.db = open_index(self.path, SCOPE)
        def resume(scope, cursor):
            calls.append(cursor)
            return page([episode('aaaaaaaaaaa', 'Updated fixture'), episode('bbbbbbbbbbb')])
        collect(self.db, SCOPE, resume)
        self.assertEqual(calls, [None, 'opaque:+/token=', 'opaque:+/token='])
        self.assertEqual(self.db.execute('SELECT count(*) FROM episodes').fetchone()[0], 2)
        updated = json.loads(self.db.execute('SELECT document FROM episodes WHERE video_id=?', ('aaaaaaaaaaa',)).fetchone()[0])
        self.assertEqual(updated['title'], 'Updated fixture')
        self.assertEqual(self.db.execute('SELECT cursor,done FROM checkpoint').fetchone(), (None, 1))
        saved = json.loads(self.db.execute('SELECT metadata FROM pages ORDER BY page_number DESC LIMIT 1').fetchone()[0])
        self.assertEqual(saved['window']['before'], '2026-09-01T00:00:00Z')
        self.assertIn('Synthetic', saved['note'])
        collect(self.db, SCOPE, lambda *_: self.fail('Completed index must not fetch again'))

    def test_failure_during_insertion_rolls_back_entire_page(self):
        self.db.executescript("CREATE TRIGGER fail_insert BEFORE INSERT ON episodes WHEN NEW.video_id='bbbbbbbbbbb' BEGIN SELECT RAISE(ABORT, 'simulated disk failure'); END;")
        with self.assertRaises(sqlite3.IntegrityError):
            collect(self.db, SCOPE, lambda *_: page([episode('aaaaaaaaaaa'), episode('bbbbbbbbbbb')]))
        self.assertEqual(self.db.execute('SELECT count(*) FROM episodes').fetchone()[0], 0)
        self.assertEqual(self.db.execute('SELECT count(*) FROM pages').fetchone()[0], 0)
        self.assertEqual(self.db.execute('SELECT cursor,done FROM checkpoint').fetchone(), (None, 0))

    def test_abrupt_process_exit_leaves_no_half_committed_page(self):
        code = """
import os, sys
from resume_catalog import collect, open_index
from test_resume_catalog import SCOPE, episode, page
db = open_index(sys.argv[1], SCOPE)
db.create_function('crash_now', 0, lambda: os._exit(86))
db.execute("CREATE TEMP TRIGGER crash_after_insert AFTER INSERT ON episodes BEGIN SELECT crash_now(); END;")
collect(db, SCOPE, lambda *_: page([episode('aaaaaaaaaaa')], 'next'))
"""
        result = subprocess.run([sys.executable, '-c', code, self.path], cwd=Path(__file__).parent)
        self.assertEqual(result.returncode, 86)
        self.db.close()
        self.db = open_index(self.path, SCOPE)
        self.assertEqual(self.db.execute('SELECT count(*) FROM episodes').fetchone()[0], 0)
        self.assertEqual(self.db.execute('SELECT count(*) FROM pages').fetchone()[0], 0)
        self.assertEqual(self.db.execute('SELECT cursor,done FROM checkpoint').fetchone(), (None, 0))
        collect(self.db, SCOPE, lambda *_: page([episode('aaaaaaaaaaa')]))
        self.assertEqual(self.db.execute('SELECT count(*) FROM episodes').fetchone()[0], 1)

    def test_query_change_refused(self):
        with self.assertRaises(ValueError):
            open_index(self.path, {**SCOPE, 'after': '2026-07-01'})

    def test_missing_cursor_refused_without_writing(self):
        broken = {**page([episode('aaaaaaaaaaa')]), 'has_more': True}
        with self.assertRaises(ValueError):
            collect(self.db, SCOPE, lambda *_: broken)
        self.assertEqual(self.db.execute('SELECT count(*) FROM episodes').fetchone()[0], 0)

    def test_page_budget_stops_at_saved_continuation(self):
        calls = []
        def fetch(scope, cursor):
            calls.append(cursor)
            return page([episode('aaaaaaaaaaa')], 'next')
        collect(self.db, SCOPE, fetch, max_pages=1)
        self.assertEqual(calls, [None])
        self.assertEqual(self.db.execute('SELECT cursor,done FROM checkpoint').fetchone(), ('next', 0))


if __name__ == '__main__':
    unittest.main(verbosity=2)
