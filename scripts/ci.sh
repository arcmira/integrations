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
git diff --check
git diff --cached --check
