#!/usr/bin/env bash
# Capture the deployed preview at desktop and mobile sizes without touching the app.
set -euo pipefail

CAPTURE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CAPTURE_ROOT"

: "${CAPTURE_URL:?Set CAPTURE_URL to the preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the project.}"
RUNTIME="${RUNTIME_DIR:-${RUNNER_TEMP:-/home/runner/work/_temp}/omgithub-runtime}"
CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-#app[data-ready=\"true\"]}"
export CAPTURE_READY_SELECTOR

CAPTURE_ABS="$(realpath -m "$CAPTURE_DIR")"
PROJECT_ABS="$(realpath -m "$CAPTURE_ROOT")"
case "$CAPTURE_ABS" in
  "$PROJECT_ABS"|"$PROJECT_ABS"/*)
    echo "CAPTURE_DIR must be outside the project source: $CAPTURE_ABS" >&2
    exit 1
    ;;
esac

/usr/bin/time -p mkdir -p "$CAPTURE_ABS"
exec /usr/bin/time -p node "$RUNTIME/scripts/default-capture.mjs"
