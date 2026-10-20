#!/usr/bin/env bash
# LG webOS : tests + paquet .ipk + installation + lancement, en une commande.
#   ./scripts/install-lg.sh            (TV enregistrée sous le nom « tv »)
#   LG_DEVICE=salon ./scripts/install-lg.sh
# Prérequis (une seule fois, voir docs/INSTALLATION-LG.md) :
#   - CLI webOS TV : npm install -g @webos-tools/cli
#   - app « Developer Mode » sur la TV (compte LG), puis : ares-setup-device  et  ares-novacom --device tv --getkey
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE="${LG_DEVICE:-tv}"
APP_ID="com.estebanbaigts.accueilplus"

command -v ares-package >/dev/null || { echo "CLI webOS absente : npm install -g @webos-tools/cli (voir docs/INSTALLATION-LG.md)."; exit 1; }

node "$ROOT/tests/run-tests.js" | tail -1

STAGE="$ROOT/build/lg"; rm -rf "$STAGE"; mkdir -p "$STAGE" "$ROOT/dist"
# Même dossier app/ que Samsung, sans les fichiers propres à Tizen.
cp -R "$ROOT/app/." "$STAGE/"
rm -f "$STAGE/config.xml"; find "$STAGE" -name '.DS_Store' -delete
ares-package "$STAGE" -o "$ROOT/dist" >/dev/null
IPK="$(ls -t "$ROOT"/dist/*.ipk | head -1)"
echo "== Paquet : $(basename "$IPK")"

ares-install -d "$DEVICE" "$IPK"
ares-launch -d "$DEVICE" "$APP_ID" && echo "OK : Accueil+ est lancé sur la TV LG."
