#!/usr/bin/env python3
"""Exercise release verification with a real temporary Git repository."""

import contextlib
import hashlib
import importlib.util
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "release_verifier", Path(__file__).with_name("verify-python-release.py")
)
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


class ReleaseVerificationTests(unittest.TestCase):
    package_path = verifier.PACKAGE
    package_name = "langchain-arcmira"
    artifact_name = "langchain_arcmira"
    tag = "langchain-python-v0.1.0"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Release test")
        self.git("config", "user.email", "release-test@example.invalid")
        self.source = self.repo / self.package_path / "source.py"
        self.source.parent.mkdir(parents=True)
        self.source.write_text("original source\n")
        self.commit()
        self.git("tag", self.tag)
        self.dist = self.repo / "dist"
        self.dist.mkdir()
        self.wheel = self.dist / f"{self.artifact_name}-0.1.0-py3-none-any.whl"
        self.wheel.write_bytes(b"verified wheel")
        self.sdist = self.dist / f"{self.artifact_name}-0.1.0.tar.gz"
        self.sdist.write_bytes(b"verified sdist")
        self.manifest = self.repo / "manifest.json"
        self.manifest.write_text(
            json.dumps(
                {
                    "package": self.package_name,
                    "version": "0.1.0",
                    "tag": self.tag,
                    "package_tree": self.git("rev-parse", f"HEAD:{self.package_path}"),
                    "files": {
                        p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                        for p in (self.wheel, self.sdist)
                    },
                }
            )
        )

    def git(self, *args):
        return subprocess.check_output(
            ["git", *args], cwd=self.repo, text=True, stderr=subprocess.STDOUT
        ).strip()

    def commit(self):
        self.git("add", self.package_path)
        self.git("-c", "commit.gpgsign=false", "commit", "-qm", "Test source")

    def verify(self, tag=None):
        with contextlib.redirect_stdout(io.StringIO()):
            verifier.verify(self.dist, tag, repo=self.repo, manifest_path=self.manifest, package=self.package_path)

    def test_exact_release_passes_with_tag(self):
        self.verify(self.tag)

    def test_uv_metadata_passes_locally(self):
        (self.dist / ".gitignore").write_bytes(b"*")
        self.verify()

    def test_corrupted_artifact_fails(self):
        self.wheel.write_bytes(b"corrupted")
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            self.verify()

    def test_missing_artifact_fails(self):
        self.sdist.unlink()
        with self.assertRaisesRegex(ValueError, "exactly"):
            self.verify()

    def test_unexpected_entries_fail(self):
        for name, content in (("extra.whl", b"x"), (".gitignore", b"unexpected")):
            with self.subTest(name=name):
                path = self.dist / name
                path.write_bytes(content)
                with self.assertRaisesRegex(ValueError, "exactly"):
                    self.verify()
                path.unlink()
        extra = self.dist / "extra"
        extra.mkdir()
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            self.verify()

    def test_symlink_fails_even_with_matching_bytes(self):
        target = self.repo / "wheel"
        self.wheel.rename(target)
        self.wheel.symlink_to(target)
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            self.verify()

    def test_wrong_tag_fails(self):
        with self.assertRaisesRegex(ValueError, "tag does not match"):
            self.verify("other-tag")

    def test_committed_source_mismatch_fails_without_tag(self):
        self.source.write_text("changed source\n")
        self.commit()
        with self.assertRaisesRegex(ValueError, "source differs.*HEAD"):
            self.verify()

    def test_uncommitted_source_mismatch_fails(self):
        self.source.write_text("changed source\n")
        with self.assertRaisesRegex(ValueError, "uncommitted"):
            self.verify()

    def test_new_source_file_fails(self):
        self.source.with_name("new.py").write_text("new source\n")
        with self.assertRaisesRegex(ValueError, "uncommitted"):
            self.verify()

    def test_tag_source_mismatch_fails(self):
        self.source.write_text("changed source\n")
        self.commit()
        self.git("tag", "-f", self.tag)
        self.git("reset", "--hard", "HEAD~1")
        with self.assertRaisesRegex(ValueError, "source differs.*" + self.tag):
            self.verify(self.tag)


class LangflowReleaseVerificationTests(ReleaseVerificationTests):
    package_path = "packages/langflow"
    package_name = "lfx-arcmira"
    artifact_name = "lfx_arcmira"
    tag = "langflow-v0.1.0"


if __name__ == "__main__":
    unittest.main()
