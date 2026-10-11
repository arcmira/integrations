#!/usr/bin/env python3
"""Exercise the n8n release verifier with real Git repositories and tar archives."""

import hashlib
import importlib.util
import io
import json
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("release", Path(__file__).with_name("verify-n8n-release.py"))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.dist = self.repo / "release"
        self.dist.mkdir()
        self.source = self.repo / "packages/n8n"
        self.source.mkdir(parents=True)
        (self.source / "source.txt").write_text("verified source")
        for args in [("init", "-q"), ("config", "user.name", "Release Test"),
                     ("config", "user.email", "test@example.invalid"),
                     ("config", "commit.gpgsign", "false"), ("add", "packages"),
                     ("commit", "-qm", "Fixture"), ("tag", "n8n-v0.1.0")]:
            self.git(*args)
        self.package = {"name": "n8n-nodes-arcmira", "version": "0.1.0", "homepage": "https://arcmira.com",
                        "n8n": {"nodes": ["dist/nodes/Arcmira.js"], "credentials": ["dist/credentials/Arcmira.js"]}}
        self.make_archive()

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo, text=True).strip()

    def make_archive(self, extra=None):
        self.archive = self.dist / "n8n-nodes-arcmira-0.1.0.tgz"
        entries = {"package/package.json": json.dumps(self.package),
                   "package/README.md": "Fixture documentation",
                   "package/LICENSE.md": "Fixture license",
                   "package/dist/nodes/Arcmira.js": "exports.Arcmira = {};",
                   "package/dist/credentials/Arcmira.js": "exports.Arcmira = {};"}
        entries.update(extra or {})
        with tarfile.open(self.archive, "w:gz") as tar:
            for name, text in entries.items():
                data = text.encode()
                info = tarfile.TarInfo(name)
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
        manifest = {"version": "0.1.0", "tag": "n8n-v0.1.0",
                    "package_tree": self.git("rev-parse", "HEAD:packages/n8n"),
                    "files": {self.archive.name: hashlib.sha256(self.archive.read_bytes()).hexdigest()}}
        folder = self.repo / "release-artifacts/n8n"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "current.json").write_text(json.dumps(manifest))

    def verify(self):
        return release.verify(self.repo, self.dist, "n8n-v0.1.0")

    def test_valid_release(self):
        self.assertEqual(self.verify(), "Verified n8n-nodes-arcmira 0.1.0: n8n-nodes-arcmira-0.1.0.tgz")

    def test_changed_archive(self):
        self.archive.write_bytes(self.archive.read_bytes() + b"changed")
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.verify()

    def test_dirty_source(self):
        (self.source / "source.txt").write_text("unreviewed")
        with self.assertRaisesRegex(ValueError, "uncommitted"):
            self.verify()

    def test_changed_committed_source(self):
        (self.source / "source.txt").write_text("new source")
        self.git("add", "packages")
        self.git("commit", "-qm", "Change")
        with self.assertRaisesRegex(ValueError, "source differs"):
            self.verify()

    def test_unexpected_archive_content(self):
        self.make_archive({"package/.env": "fixture"})
        with self.assertRaisesRegex(ValueError, "Unexpected archive entry"):
            self.verify()

    def test_private_package(self):
        self.package["private"] = True
        self.make_archive()
        with self.assertRaisesRegex(ValueError, "Private package"):
            self.verify()

    def test_missing_node_entry(self):
        self.package["n8n"]["nodes"] = ["dist/nodes/missing.js"]
        self.make_archive()
        with self.assertRaisesRegex(ValueError, "Missing declared"):
            self.verify()

    def test_runtime_dependency(self):
        self.package["dependencies"] = {"some-package": "1.0.0"}
        self.make_archive()
        with self.assertRaisesRegex(ValueError, "runtime dependencies"):
            self.verify()

    def test_path_traversal(self):
        self.make_archive({"package/dist/nodes/../../secret": "fixture"})
        with self.assertRaisesRegex(ValueError, "Unexpected archive entry"):
            self.verify()


if __name__ == "__main__":
    unittest.main()
