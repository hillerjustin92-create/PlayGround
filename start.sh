#!/usr/bin/env bash
# Build the static AnyClaw app and serve it in the foreground on PORT.
set -euo pipefail

START_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$START_DIR"

PORT="${PORT:-3000}"
export PORT
RUNTIME="${RUNTIME_DIR:-${RUNNER_TEMP:-/home/runner/work/_temp}/omgithub-runtime}"
WEB_DIR="${OPENCODE_WEB_DIR:-${RUNNER_TEMP:-/home/runner/work/_temp}/omgithub-web}"
DEPLOYMENT_OUTPUT="$WEB_DIR/deployment-output.json"

/usr/bin/time -p mkdir -p "$WEB_DIR"

# Publish the exact project/static-output contract for the controller.
/usr/bin/time -p node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const project = path.resolve(process.argv[1]);
  const directory = path.join(project, "dist");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(process.argv[2], JSON.stringify({ project, directory }));
' "$START_DIR" "$DEPLOYMENT_OUTPUT"

if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    /usr/bin/time -p npm ci --no-audit --no-fund
  else
    /usr/bin/time -p npm install --no-audit --no-fund
  fi
  /usr/bin/time -p npm run build --if-present
fi

# Always rebuild the static source so a reused app-server never serves stale files.
if [[ ! -f package.json ]] || [[ ! -f dist/index.html ]]; then
  /usr/bin/time -p node scripts/build.mjs
fi

/usr/bin/time -p test -f dist/index.html
cd dist
exec env -u OPENCODE_WEB_DIR /usr/bin/time -p node "$RUNTIME/scripts/default-start.mjs"
