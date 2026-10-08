#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
install_args=()
case "${1:-}" in
  "") ;;
  --offline)
    install_args=(--offline)
    export UV_OFFLINE=true
    export npm_config_offline=true
    ;;
  *) echo "Usage: $0 [--offline]" >&2; exit 2 ;;
esac
if (( $# > 1 )); then echo "Usage: $0 [--offline]" >&2; exit 2; fi
for package in langchain ai-sdk; do
  (
    cd "packages/$package"
    npm ci --ignore-scripts --no-audit --no-fund "${install_args[@]}"
    npm run build
    npm test
  )
done
(
  cd packages/appmixer
  npm ci --ignore-scripts --no-audit --no-fund "${install_args[@]}"
  npm test
  npm run pack:service
)
(
  cd packages/activepieces
  npm ci --ignore-scripts --no-audit --no-fund "${install_args[@]}"
  npm test
  npm run bundle
  npm pack ./bundle --json > pack.json
  ARCMIRA_PIECE_PATH=../bundle/index.js node --test test/*.test.cjs
  node scripts/check-packed.cjs
)
(
  cd packages/n8n
  pnpm install --frozen-lockfile --ignore-scripts "${install_args[@]}"
  pnpm build
  pnpm lint
  pnpm test
  pnpm check:contract
)
(
  cd packages/pipedream
  npm ci --ignore-scripts --no-audit --no-fund "${install_args[@]}"
  npm test
  npm run validate
)
(
  cd packages/dify
  uv sync --frozen "${install_args[@]}"
  uv run --frozen python -m unittest discover -s test -v
)
(
  cd packages/langchain-python
  uv sync --frozen "${install_args[@]}"
  uv run --frozen ruff check .
  uv run --frozen pytest tests/unit_tests -q
  uv build
  uv run --frozen twine check dist/*
)
(
  cd examples/dlt
  uv sync --frozen "${install_args[@]}"
  RUNTIME__DLTHUB_TELEMETRY=false uv run --frozen python -m unittest discover -s test -v
)
airbyte_python="${ARCMIRA_AIRBYTE_PYTHON:-$PWD/packages/airbyte/.venv/bin/python}"
if [[ ! -x "$airbyte_python" ]]; then
  echo "Airbyte checks need an existing locked Python environment; see packages/airbyte/README.md." >&2
  exit 1
fi
(
  cd packages/airbyte
  "$airbyte_python" generate_schemas.py --check
  "$airbyte_python" -m pytest test_source.py -q
)
meltano_python="${ARCMIRA_MELTANO_PYTHON:-$PWD/packages/meltano/.venv/bin/python}"
if [[ ! -x "$meltano_python" ]]; then
  echo "Meltano checks need the locked Python environment; see packages/meltano/README.md." >&2
  exit 1
fi
(
  cd packages/meltano
  "$meltano_python" check_schemas.py
  "$meltano_python" -m pytest tests -q
  "$meltano_python" -m hatchling build
)
(
  cd packages/langflow
  uv sync --frozen "${install_args[@]}"
  uv run --frozen python -m unittest discover -s tests -v
  uv run --frozen lfx extension validate . --execute-imports
  uv run --frozen lfx extension list --format json
  uv build
)
(
  cd examples/node-red-source-shortlist
  npm ci --ignore-scripts --no-audit --no-fund "${install_args[@]}"
  npm test
)
(
  cd examples/remotion-quote-cards
  pnpm install --frozen-lockfile --ignore-scripts "${install_args[@]}"
  pnpm check
)
python3 scripts/test-python-release.py
git diff --check
git diff --cached --check
