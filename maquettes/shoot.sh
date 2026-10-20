#!/usr/bin/env bash
# Capture 1920×1080 des maquettes (Chrome headless). Usage : ./shoot.sh 1-cinema [2-console ...]
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p captures
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; P="$(mktemp -d)"
for f in "$@"; do
  "$CH" --headless=new --user-data-dir="$P" --hide-scrollbars --window-size=1920,1080 --virtual-time-budget=3000 \
    --screenshot="$PWD/captures/$f.png" "http://localhost:8765/maquettes/$f.html" >/dev/null 2>&1
done
rm -rf "$P"
