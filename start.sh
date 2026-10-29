#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PROJECT_DIR="$PWD"
SITE_DIR="$PROJECT_DIR/site"
DIST_DIR="$PROJECT_DIR/dist"
PORT="${PORT:-3000}"
WEB_DIR="${OPENCODE_WEB_DIR:-}"

if [[ ! -f "$SITE_DIR/index.html" ]]; then
  echo "Missing static source: $SITE_DIR/index.html" >&2
  exit 1
fi

if [[ -n "$WEB_DIR" ]]; then
  /usr/bin/time -p mkdir -p "$WEB_DIR"
fi

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
  if /usr/bin/time -p node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)"; then
    /usr/bin/time -p npm run build
  fi
fi

if [[ -f "$PROJECT_DIR/requirements.txt" ]]; then
  /usr/bin/time -p python3 -m pip install --user --disable-pip-version-check -r "$PROJECT_DIR/requirements.txt"
fi

/usr/bin/time -p rm -rf "$DIST_DIR"
/usr/bin/time -p mkdir -p "$DIST_DIR"
/usr/bin/time -p cp -R "$SITE_DIR"/. "$DIST_DIR"/

/usr/bin/time -p python3 - "$PROJECT_DIR" "$DIST_DIR" "$WEB_DIR" <<'PY'
import json
import os
import sys
from pathlib import Path

project, directory, web_dir = sys.argv[1:4]
if web_dir:
    Path(web_dir).mkdir(parents=True, exist_ok=True)
    Path(web_dir, "deployment-output.json").write_text(
        json.dumps({"project": project, "directory": directory}) + "\n",
        encoding="utf-8",
    )
PY

echo "Serving KI-Kumpel from $DIST_DIR on http://0.0.0.0:$PORT" >&2
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DIST_DIR"
