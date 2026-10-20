#!/usr/bin/env bash
# Capture 1920×1080 de la page de dev (serveur ./scripts/serve.sh lancé).
# Usage : ./scripts/capture.sh nom "scenario=default&keys=L,L,D"
set -euo pipefail
cd "$(dirname "$0")/.."; mkdir -p docs/captures
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; P="$(mktemp -d)"
"$CH" --headless=new --user-data-dir="$P" --hide-scrollbars --window-size=1920,1080 --virtual-time-budget=6000 \
  --screenshot="$PWD/docs/captures/$1.png" "http://localhost:8765/dev/?fresh=1&$2" >/dev/null 2>&1
rm -rf "$P"; echo "docs/captures/$1.png"
