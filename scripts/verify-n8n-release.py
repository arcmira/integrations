#!/usr/bin/env python3
"""Verify the approved n8n archive and optional release-runner rebuild."""

import argparse
import hashlib
import json
import subprocess
import tarfile
from pathlib import Path, PurePosixPath


def verify(repo: Path, directory: Path, tag: str) -> str:
    manifest = json.loads((repo / "release-artifacts/n8n/current.json").read_text())
    name = f"n8n-nodes-arcmira-{manifest['version']}.tgz"
    if tag != manifest["tag"] or set(manifest["files"]) != {name}:
        raise ValueError("Unexpected release tag or archive name")
    if {p.name for p in directory.iterdir()} != {name}:
        raise ValueError("Release directory must contain only the recorded archive")
    archive = directory / name
    if archive.is_symlink() or not archive.is_file():
        raise ValueError("Release archive must be a regular file")
    if hashlib.sha256(archive.read_bytes()).hexdigest() != manifest["files"][name]:
        raise ValueError("Release checksum mismatch")
    for ref in ("HEAD", tag):
        tree = subprocess.check_output(
            ["git", "rev-parse", f"{ref}:packages/n8n"], cwd=repo, text=True
        ).strip()
        if tree != manifest["package_tree"]:
            raise ValueError("Package source differs from the verified release")
    if subprocess.check_output(
        ["git", "status", "--porcelain", "--untracked-files=all", "--", "packages/n8n"],
        cwd=repo, text=True,
    ).strip():
        raise ValueError("Package source has uncommitted changes")
    with tarfile.open(archive, "r:gz") as tar:
        members = tar.getmembers()
        names = [m.name for m in members]
        if len(names) != len(set(names)):
            raise ValueError("Duplicate archive paths")
        if not {"package/package.json", "package/README.md", "package/LICENSE.md"}.issubset(names):
            raise ValueError("Missing package metadata, README or license")
        for member in members:
            path = PurePosixPath(member.name)
            allowed = member.name in {"package/package.json", "package/README.md", "package/LICENSE.md"} or member.name.startswith(("package/dist/nodes/", "package/dist/credentials/"))
            if not member.isfile() or ".." in path.parts or not allowed:
                raise ValueError("Unexpected archive entry")
        package = json.load(tar.extractfile("package/package.json"))
        if package["name"] != "n8n-nodes-arcmira" or package["version"] != manifest["version"]:
            raise ValueError("Archive identity mismatch")
        if package.get("private") or package.get("dependencies"):
            raise ValueError("Private package or runtime dependencies cannot ship")
        if package.get("homepage") != "https://arcmira.com":
            raise ValueError("Missing canonical homepage")
        for key in ("nodes", "credentials"):
            declared = package.get("n8n", {}).get(key, [])
            if not declared or any("package/" + item not in names for item in declared):
                raise ValueError("Missing declared n8n entry point")
    return f"Verified n8n-nodes-arcmira {manifest['version']}: {name}"


def compare_rebuild(approved: Path, rebuilt: Path) -> None:
    def contents(path):
        if path.is_symlink() or not path.is_file():
            raise ValueError("Rebuild archive must be a regular file")
        result = {}
        with tarfile.open(path, "r:gz") as archive:
            for member in archive.getmembers():
                if not member.isfile() or member.name in result:
                    raise ValueError("Unexpected rebuild archive entry")
                result[member.name] = (member.mode, archive.extractfile(member).read())
        return result
    if contents(approved) != contents(rebuilt):
        raise ValueError("Rebuilt package differs from approved archive")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--rebuilt", type=Path)
    args = parser.parse_args()
    print(verify(args.repo, args.directory, args.tag))

    if args.rebuilt:
        compare_rebuild(next(args.directory.glob("*.tgz")), args.rebuilt)
        print("Release-runner package contents match the approved archive")
