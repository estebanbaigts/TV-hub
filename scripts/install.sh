#!/usr/bin/env bash
# Installation en une commande : tests + paquet signé + installation + lancement sur la TV.
#   ./scripts/install.sh              (IP mémorisée, ou TV déjà connectée)
#   ./scripts/install.sh 192.168.1.123
# Prérequis (une seule fois) : mode développeur sur la TV + profil de signature Samsung
# (voir docs/INSTALLATION.md). Ne modifie aucun réglage de la TV.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="${TIZEN_STUDIO:-$HOME/tizen-studio}"
SDB="$TS/tools/sdb"; TIZEN="$TS/tools/ide/bin/tizen"
PROFILE="${TIZEN_PROFILE:-TVHub}"
IP_FILE="$ROOT/.tv-ip"   # ignoré par git
APP_ID="tvhubPerso.TVHub"

[ -x "$SDB" ] && [ -x "$TIZEN" ] || { echo "Tizen Studio introuvable dans $TS (voir docs/INSTALLATION.md)."; exit 1; }

IP="${1:-$(cat "$IP_FILE" 2>/dev/null || true)}"
if [ -n "$IP" ]; then
  # sdb se bloque parfois après une veille de la TV : on relance son service si besoin.
  if ! "$SDB" connect "$IP:26101" 2>&1 | grep -q "connected to"; then
    "$SDB" kill-server >/dev/null 2>&1 || true
    "$SDB" connect "$IP:26101" >/dev/null 2>&1 || true
  fi
  echo "$IP" > "$IP_FILE"
fi

DEVICE="$("$SDB" devices | awk 'NR>1 && $2=="device" {print $3; exit}')"
if [ -z "$DEVICE" ]; then
  echo "Aucune TV connectée."
  echo "  1. TV allumée, même réseau que le Mac, mode développeur actif."
  echo "  2. Relancer avec l'IP de la TV : ./scripts/install.sh 192.168.1.xx"
  exit 1
fi
echo "== TV : $DEVICE"

TIZEN_PROFILE="$PROFILE" "$ROOT/scripts/build.sh" | tail -2
WGT="$(ls -t "$ROOT"/dist/TVHub-*.wgt | grep -v unsigned | head -1)"

echo "== Installation de $(basename "$WGT")"
"$TIZEN" install -n "$WGT" -t "$DEVICE" | grep -E "successfully|error|fail" || true
"$SDB" -s "$("$SDB" devices | awk 'NR>1 && $2=="device" {print $1; exit}')" shell 0 was_execute "$APP_ID" >/dev/null 2>&1 \
  && echo "OK : Accueil+ est lancé sur la TV." || echo "Installé. Lancez Accueil+ depuis Applications."
