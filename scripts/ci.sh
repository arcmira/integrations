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
git diff --check
git diff --cached --check
