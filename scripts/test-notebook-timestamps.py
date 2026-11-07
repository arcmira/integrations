import ast
import csv
import tempfile
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch


class NotebookTimestamps(unittest.TestCase):
    def test_live_search_links(self):
        notebook = json.loads((Path(__file__).resolve().parents[1] / "examples/quote-research-notebook/youtube-transcript-search.ipynb").read_text())
        tree = ast.parse("".join(notebook["cells"][3]["source"]))
        tree.body = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom, ast.FunctionDef))]
        scope = {}
        exec(compile(tree, "notebook", "exec"), scope)
        for line, expected in [(151, 151), (0, 0), (None, 12), ("missing", 12)]:
            with self.subTest(line=line):
                chunk = {"video_id": "test-video", "start_seconds": 12, "text": "Synthetic passage.", "watch_url": "https://arcmira.com/watch?v=test-video&t=" + str(expected)}
                if line != "missing":
                    chunk["line_start_seconds"] = line
                response = io.StringIO(json.dumps({"chunks": [chunk]}))
                response.status = 200
                with patch.dict(scope["os"].environ, {"ARCMIRA_API_KEY": "synthetic"}), patch.dict(scope, {"HTTPSConnection": unittest.mock.Mock()}):
                    scope["HTTPSConnection"].return_value.getresponse.return_value = response
                    _, rows, _ = scope["search_passages"]("test")
                self.assertEqual(rows[0]["source"], "https://www.youtube.com/watch?v=test-video&t=" + str(expected))
                self.assertEqual(rows[0]["seconds"], expected)
                self.assertEqual(rows[0]["passage_start_seconds"], 12)
                self.assertEqual(rows[0]["transcript"], chunk["watch_url"])
                with tempfile.TemporaryDirectory() as directory:
                    output = Path(directory) / "sources.csv"
                    scope.update(passages=rows, search_term="test", live_search=True)
                    with patch("pathlib.Path", return_value=output), patch("builtins.print"):
                        exec("".join(notebook["cells"][7]["source"]), scope)
                    with output.open() as stream:
                        exported = list(csv.DictReader(stream))
                    self.assertEqual(exported[0]["seconds"], str(expected))
                    self.assertEqual(exported[0]["passage_start_seconds"], "12")


if __name__ == "__main__":
    unittest.main()
