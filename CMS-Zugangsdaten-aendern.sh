#!/bin/bash
# Doppelklick-/Terminal-Start des Einrichtungsassistenten fuer Linux.
# Gegenstueck zu CMS-Zugangsdaten-aendern.bat (Windows) / .command (macOS).

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
    echo "[FEHLER] Node.js wurde nicht gefunden."
    echo "Bitte installiere Node.js von https://nodejs.org/ (LTS-Version)"
    echo "oder ueber den Paketmanager deiner Distribution, und starte dieses"
    echo "Fenster danach neu."
    echo ""
    read -r -p "Zum Beenden Enter druecken..." _
    exit 1
fi

bash "scripts/cms-setup.sh"

echo ""
read -r -p "Zum Beenden Enter druecken..." _
