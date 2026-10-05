#!/usr/bin/env python3
"""Verify prebuilt release files before the publishing-only workflow uploads them."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MANIFEST = REPO / "release-artifacts/langchain-python/current.json"
PACKAGE = "packages/langchain-python"


def verify(
    directory: Path,
    tag: str | None = None,
    *,
    repo: Path = REPO,
    manifest_path: Path = MANIFEST,
) -> None:
    manifest = json.loads(manifest_path.read_text())
    expected = manifest["files"]
    actual = set()
    for path in directory.iterdir():
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Unexpected release directory entry: {path.name}")
        if path.name == ".gitignore" and path.read_bytes() == b"*":
            continue  # uv build writes this local metadata file.
        actual.add(path.name)
    if actual != set(expected):
        raise ValueError(
            "Release directory must contain exactly the recorded wheel and sdist."
        )
    for name, checksum in expected.items():
        if hashlib.sha256((directory / name).read_bytes()).hexdigest() != checksum:
            raise ValueError(f"Release checksum mismatch: {name}")
    if tag:
        if tag != manifest["tag"]:
            raise ValueError("Release tag does not match the manifest.")
    for ref in ("HEAD", tag) if tag else ("HEAD",):
        tree = subprocess.check_output(
            ["git", "rev-parse", f"{ref}:{PACKAGE}"], cwd=repo, text=True
        ).strip()
        if tree != manifest["package_tree"]:
            raise ValueError(f"Package source differs from the verified release: {ref}")
    if subprocess.check_output(
        ["git", "status", "--porcelain", "--untracked-files=all", "--", PACKAGE],
        cwd=repo,
        text=True,
    ).strip():
        raise ValueError("Package source has uncommitted changes.")
    print(
        f"Verified {manifest['package']} {manifest['version']}: "
        f"{len(expected)} artifacts."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--tag")
    args = parser.parse_args()
    verify(args.directory, args.tag)
