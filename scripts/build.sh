#!/usr/bin/env bash
# Construit TV Hub de façon reproductible.
#   ./scripts/build.sh              -> tests + paquet .wgt (signé si la CLI Tizen et un profil existent)
#   TIZEN_PROFILE=MonProfil ./scripts/build.sh
# Ne se connecte jamais au téléviseur : l'installation est une étape séparée et manuelle.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/build/stage"
DIST="$ROOT/dist"
VERSION="$(grep -o 'tvhub" version="[0-9.]*"' "$ROOT/app/config.xml" | grep -o '[0-9][0-9.]*')"

echo "== TV Hub $VERSION =="

python3 -I "$ROOT/scripts/make_dev_page.py"
echo "-- Tests"
node "$ROOT/tests/run-tests.js"

echo "-- Préparation"
rm -rf "$ROOT/build" && mkdir -p "$STAGE" "$DIST"
# Seul le dossier app/ est empaqueté (la simulation dev/ n'en fait jamais partie).
cp -R "$ROOT/app/." "$STAGE/"
find "$STAGE" -name '.DS_Store' -delete
# Fichiers propres à LG webOS : inutiles dans le paquet Samsung.
rm -f "$STAGE/appinfo.json" "$STAGE/icon-80.png" "$STAGE/icon-130.png"

# Localisation de la CLI Tizen (Tizen Studio).
TIZEN_BIN="${TIZEN_BIN:-}"
if [ -z "$TIZEN_BIN" ]; then
  for c in "$(command -v tizen 2>/dev/null || true)" "$HOME/tizen-studio/tools/ide/bin/tizen"; do
    if [ -n "$c" ] && [ -x "$c" ]; then TIZEN_BIN="$c"; break; fi
  done
fi

if [ -n "$TIZEN_BIN" ] && [ -n "${TIZEN_PROFILE:-}" ]; then
  echo "-- Empaquetage signé avec le profil « $TIZEN_PROFILE »"
  rm -f "$STAGE"/*.wgt
  "$TIZEN_BIN" package -t wgt -s "$TIZEN_PROFILE" -- "$STAGE"
  mv "$STAGE"/*.wgt "$DIST/TVHub-$VERSION.wgt"
  echo "OK : $DIST/TVHub-$VERSION.wgt (installable sur le téléviseur enregistré dans le certificat)"
else
  echo "-- CLI Tizen ou profil de signature absent : paquet NON signé (inspection seulement)"
  ( cd "$STAGE" && rm -f "$DIST/TVHub-$VERSION-unsigned.wgt" && zip -qrX "$DIST/TVHub-$VERSION-unsigned.wgt" . )
  echo "OK : $DIST/TVHub-$VERSION-unsigned.wgt"
  echo "   Ce fichier N'EST PAS installable sur un téléviseur du commerce."
  echo "   Voir docs/INSTALLATION.md pour créer un certificat Samsung et signer."
fi
