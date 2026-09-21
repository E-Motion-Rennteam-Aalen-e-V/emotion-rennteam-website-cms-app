#!/bin/bash
# Doppelklick-Start des Einrichtungsassistenten fuer macOS.
# Gegenstueck zu CMS-Zugangsdaten-aendern.bat (Windows).

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
    echo "[FEHLER] Node.js wurde nicht gefunden."
    echo "Bitte installiere Node.js von https://nodejs.org/ (LTS-Version)"
    echo "und starte dieses Fenster danach neu."
    echo ""
    read -r -p "Zum Beenden Enter druecken..." _
    exit 1
fi

bash "scripts/cms-setup.sh"

echo ""
read -r -p "Zum Beenden Enter druecken..." _
