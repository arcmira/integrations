#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
base='airbyte/python-connector-base:4.1.1@sha256:a268b44c733ae699a60f5fbc06a324945dba98945c6e2ab7f8609f2f895b0d28'
context=$(mktemp -d)
trap 'rm -rf "$context"' EXIT
mkdir "$context/wheelhouse"
cp Dockerfile requirements.lock source_arcmira.py spec.json LICENSE "$context/"
cp -R schemas "$context/schemas"
if [[ -n "${ARCMIRA_AIRBYTE_WHEELHOUSE:-}" ]]; then
  cp "$ARCMIRA_AIRBYTE_WHEELHOUSE"/*.whl "$context/wheelhouse/"
else
  docker run --rm --memory 768m --cpus 1 --pids-limit 128 \
    --entrypoint python -v "$PWD/requirements.lock:/requirements.lock:ro" \
    -v "$context/wheelhouse:/wheelhouse" "$base" \
    -m pip download --disable-pip-version-check --no-cache-dir --only-binary=:all: \
    --require-hashes -r /requirements.lock --dest /wheelhouse
fi
docker build --network none -t "${1:-arcmira/source-arcmira:0.1.0-local}" "$context"
