import gzip
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.parse import parse_qs, urlsplit

os.environ["RUNTIME__DLTHUB_TELEMETRY"] = "false"
from arcmira_pipeline import arcmira_source, load_local
from requests import HTTPError

CHANNEL = "UC-DRzaGnL_vtBUpCFH5M0tg"


def fixture(name):
    return json.loads((Path(__file__).parent / "fixtures" / f"{name}.json").read_text())


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.requests, self.responses = [], []
        test = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                test.requests.append(
                    {
                        "path": urlsplit(self.path).path,
                        "params": parse_qs(urlsplit(self.path).query),
                        "authorization": self.headers.get("Authorization"),
                    }
                )
                if not test.responses:
                    self.send_error(599, "Unexpected additional request")
                    return
                status, body = test.responses.pop(0)
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Request-Id", "fixture-request")
                self.send_header("Retry-After", "30")
                self.end_headers()
                self.wfile.write(json.dumps(body).encode())

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.directory = tempfile.TemporaryDirectory()
        self.output = Path(self.directory.name)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.directory.cleanup()

    def source(self, **kwargs):
        return arcmira_source(
            "fixture-key",
            base_url=f"http://127.0.0.1:{self.server.server_port}/v1/",
            **kwargs,
        )

    def rows(self, name):
        rows = []
        for path in (self.output / "arcmira" / name).glob("*.jsonl*"):
            opener = gzip.open if path.suffix == ".gz" else open
            with opener(path, "rt") as file:
                rows.extend(json.loads(line) for line in file)
        return rows

    def test_search_keeps_complete_response_and_filters(self):
        body = fixture("search")
        self.responses = [(200, body)]
        load_local(
            self.source(
                query="Ramp corporate cards",
                after="2026-08-01",
                transcript_source="arcmira_premium",
            ),
            self.output,
        )
        self.assertEqual([r["response"] for r in self.rows("search_pages")], [body])
        self.assertEqual(
            self.requests,
            [
                {
                    "path": "/v1/search",
                    "authorization": "Bearer fixture-key",
                    "params": {
                        "q": ["Ramp corporate cards"],
                        "after": ["2026-08-01"],
                        "source": ["arcmira_premium"],
                        "limit": ["5"],
                    },
                }
            ],
        )
        self.assertNotIn(
            "fixture-key",
            "".join(
                p.read_text(errors="ignore")
                for p in self.output.rglob("*")
                if p.is_file()
            ),
        )

    def test_empty_search_retains_coverage(self):
        body = fixture("search")
        body.update(
            chunks=[],
            returned=0,
            as_of=None,
            note="No matches in the indexed coverage window.",
        )
        self.responses = [(200, body)]
        load_local(self.source(query="AI agents"), self.output)
        self.assertEqual(self.rows("search_pages")[0]["response"], body)
        self.assertEqual(len(self.requests), 1)

    def test_cursor_pages_keep_filters_and_stop_at_end(self):
        first, last = fixture("channel"), fixture("channel")
        first.update(has_more=True, next_cursor="opaque+/= cursor")
        last.update(has_more=False, next_cursor=None)
        self.responses = [(200, first), (200, last)]
        load_local(
            self.source(
                channel_id=CHANNEL, after="2026-08-01", before="2026-09-01", max_pages=4
            ),
            self.output,
        )
        self.assertEqual(
            [r["response"] for r in self.rows("channel_pages")], [first, last]
        )
        self.assertEqual(len(self.requests), 2)
        self.assertEqual(
            self.requests[1]["params"],
            {**self.requests[0]["params"], "cursor": ["opaque+/= cursor"]},
        )
        self.assertEqual(self.requests[1]["authorization"], "Bearer fixture-key")
        self.assertEqual(self.requests[1]["path"], f"/v1/channels/{CHANNEL}/videos")

    def test_page_cap_retains_unfinished_cursor(self):
        pages = [fixture("channel") for _ in range(3)]
        for index, body in enumerate(pages):
            body.update(has_more=True, next_cursor=f"cursor-{index + 1}")
        self.responses = [(200, body) for body in pages]
        load_local(self.source(channel_id=CHANNEL, max_pages=2), self.output)
        self.assertEqual(len(self.requests), 2)
        self.assertEqual([r["response"] for r in self.rows("channel_pages")], pages[:2])

    def test_refusals_keep_body_headers_and_never_retry_or_load(self):
        for status in [401, 402, 403, 429, 503]:
            with self.subTest(status=status):
                self.requests.clear()
                body = {
                    "error": {
                        "code": "filter_requires_paid",
                        "message": "Fixture refusal",
                        "gate": "plan",
                    }
                }
                self.responses = [(status, body)]
                with self.assertRaises(Exception) as caught:
                    load_local(
                        self.source(
                            query="AI agents", transcript_source="arcmira_premium"
                        ),
                        self.output / str(status),
                    )
                error = caught.exception
                while error and not isinstance(error, HTTPError):
                    error = error.__cause__ or error.__context__
                self.assertIsInstance(error, HTTPError)
                self.assertEqual(error.response.status_code, status)
                self.assertEqual(error.response.json(), body)
                self.assertEqual(error.response.headers["Retry-After"], "30")
                self.assertEqual(
                    error.response.headers["X-Request-Id"], "fixture-request"
                )
                self.assertEqual(len(self.requests), 1)
                self.assertEqual(
                    self.requests[0]["params"]["source"], ["arcmira_premium"]
                )
                self.assertFalse(
                    list(
                        (self.output / str(status) / "arcmira").glob(
                            "search_pages/*.jsonl*"
                        )
                    )
                )

    def test_failed_second_page_does_not_load_partial_snapshot(self):
        first = fixture("channel")
        first.update(has_more=True, next_cursor="next")
        self.responses = [(200, first), (400, {"error": {"code": "invalid_cursor"}})]
        with self.assertRaises(Exception):
            load_local(self.source(channel_id=CHANNEL, max_pages=2), self.output)
        self.assertEqual(len(self.requests), 2)
        self.assertEqual(self.rows("channel_pages"), [])

    def test_non_success_and_invalid_shape_are_not_loaded(self):
        for status, body in [
            (202, {"job": {"status": "pending"}}),
            (200, {"unrelated": []}),
        ]:
            with self.subTest(status=status):
                self.responses = [(status, body)]
                with self.assertRaises(Exception):
                    load_local(
                        self.source(query="AI agents"), self.output / str(status)
                    )

    def test_invalid_bounds_fail_before_a_request(self):
        for kwargs in [
            {"query": "topic", "max_pages": 2},
            {"channel_id": "name"},
            {"query": "topic", "limit": 21},
            {"channel_id": CHANNEL, "max_pages": 0},
            {"channel_id": CHANNEL, "transcript_source": "arcmira_premium"},
        ]:
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                self.source(**kwargs)
        self.assertEqual(self.requests, [])


if __name__ == "__main__":
    unittest.main()
