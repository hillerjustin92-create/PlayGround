#!/usr/bin/env bash
set -euo pipefail

: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the project}"
: "${RUNTIME_DIR:?Set RUNTIME_DIR to the omgithub runtime directory}"

cd "$(dirname "$0")"
PROJECT_DIR="$PWD"

case "$CAPTURE_URL" in
  http://*|https://*) ;;
  *)
    echo "CAPTURE_URL must start with http:// or https://" >&2
    exit 1
    ;;
esac

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"

capture_real="$(/usr/bin/time -p realpath -m "$CAPTURE_DIR")"
project_real="$(/usr/bin/time -p realpath -m "$PROJECT_DIR")"
if [[ "$capture_real" == "$project_real" || "$capture_real" == "$project_real"/* ]]; then
  echo "CAPTURE_DIR must be outside the project source: $capture_real" >&2
  exit 1
fi

capture_script="$RUNTIME_DIR/scripts/default-capture.mjs"
if [[ ! -f "$capture_script" ]]; then
  echo "Missing runtime capture helper: $capture_script" >&2
  exit 75
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required for browser capture" >&2
  exit 75
fi

playwright_root="$HOME/.local/share/omgithub-playwright"
if [[ ! -d "$playwright_root/node_modules/playwright" ]]; then
  echo "Playwright runtime is not installed: $playwright_root" >&2
  exit 75
fi

export CAPTURE_URL
export CAPTURE_DIR

/usr/bin/time -p node "$capture_script"
