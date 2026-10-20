#!/usr/bin/env bash
# Aperçu local : http://localhost:8765/dev/  (?scenario=default|full|listfail|notizen, &e2e=1 pour le test auto)
set -euo pipefail
exec python3 -I "$(dirname "$0")/devserver.py" "${PORT:-8765}"
