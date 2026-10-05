#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for package in langchain ai-sdk; do
  (
    cd "packages/$package"
    npm ci --ignore-scripts --no-audit --no-fund
    npm run build
    npm test
  )
done
(
  cd packages/activepieces
  npm ci --ignore-scripts --no-audit --no-fund
  npm test
  npm run bundle
  npm pack ./bundle --json > pack.json
  ARCMIRA_PIECE_PATH=../bundle/index.js node --test test/*.test.cjs
  node scripts/check-packed.cjs
)
(
  cd packages/n8n
  pnpm install --frozen-lockfile --ignore-scripts
  pnpm build
  pnpm lint
  pnpm test
  pnpm check:contract
)
(
  cd packages/dify
  uv sync --frozen
  uv run --frozen python -m unittest discover -s test -v
)
(
  cd packages/langchain-python
  uv sync --frozen
  uv run --frozen ruff check .
  uv run --frozen pytest tests/unit_tests -q
  uv build
  uv run --frozen twine check dist/*
)
python3 scripts/test-python-release.py
git diff --check
git diff --cached --check
