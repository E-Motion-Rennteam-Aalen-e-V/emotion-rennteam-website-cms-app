#!/bin/bash
# Doppelklick-Start des Redaktions-CMS fuer macOS.
# Inhaltlich identisch mit CMS-Start.command (Gegenstueck zu CMS-Start.bat
# unter Windows) - diese Datei traegt bewusst den Dateinamen
# CMS-Start_macos.sh.
#
# Hinweis: macOS fuehrt Dateien per Doppelklick anhand ihres Typs aus, nicht
# anhand der Endung. Bei .sh oeffnet der Finder meist einen Texteditor.
# Zum Starten daher entweder CMS-Start.command per Doppelklick
# verwenden, oder diese Datei im Terminal ausfuehren:
#   bash CMS-Start_macos.sh

cd "$(dirname "$0")"

echo "============================================"
echo "  E-Motion Rennteam Aalen - Redaktions-CMS"
echo "============================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo "[FEHLER] Node.js wurde nicht gefunden."
    echo "Bitte installiere Node.js von https://nodejs.org/ (LTS-Version)"
    echo "und starte dieses Fenster danach neu."
    echo ""
    read -r -p "Zum Beenden Enter druecken..." _
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "[FEHLER] npm wurde nicht gefunden, obwohl Node.js vorhanden ist."
    echo "Bitte installiere Node.js von https://nodejs.org/ neu (LTS-Version)"
    echo "und starte dieses Fenster danach neu."
    echo ""
    read -r -p "Zum Beenden Enter druecken..." _
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "[FEHLER] Diese Datei liegt nicht im Projektordner."
    echo "CMS-Start_macos.sh muss im selben Ordner liegen wie \"package.json\"."
    echo ""
    read -r -p "Zum Beenden Enter druecken..." _
    exit 1
fi

# Informative Warnung wenn Git fehlt (blockiert NOT)
if ! command -v git >/dev/null 2>&1; then
    echo "[HINWEIS] Git ist nicht installiert."
    echo "Automatische Updates sind deaktiviert."
    echo "Zum Aktivieren: Git installieren von https://git-scm.com/"
    echo ""
fi

# Der Update-Check laeuft NICHT mehr hier im Vordergrund - das wuerde den
# Start unnoetig verzoegern, bevor ueberhaupt etwas zu sehen ist. Stattdessen
# prueft scripts/cms-supervisor.mjs direkt beim Start (und danach alle paar
# Minuten) im Hintergrund auf Updates, waehrend der Server bereits laeuft -
# man landet dadurch sofort auf der Login-Seite.

# Nur die tatsaechlich vorhandene next-Startdatei zaehlt. Ein blosser
# node_modules-Ordner kann von einem abgebrochenen Lauf uebrig sein.
if [ ! -f "node_modules/.bin/next" ]; then
    if [ -d "node_modules" ]; then
        echo "Eine unvollstaendige Installation wurde gefunden und wird"
        echo "aufgeraeumt. Das dauert einen Moment..."
        rm -rf "node_modules"
        if [ -d "node_modules" ]; then
            echo ""
            echo "[FEHLER] Der Ordner \"node_modules\" liess sich nicht loeschen."
            echo "Vermutlich laeuft das CMS noch in einem anderen Fenster."
            echo ""
            echo "Bitte alle anderen CMS-Fenster schliessen und diese Datei"
            echo "erneut starten."
            echo ""
            read -r -p "Zum Beenden Enter druecken..." _
            exit 1
        fi
        echo "Aufgeraeumt."
        echo ""
    fi

    echo "Abhaengigkeiten werden installiert."
    echo ""
    echo "  WICHTIG: Das dauert beim ersten Mal 2 bis 10 Minuten."
    echo "  Waehrenddessen passiert oft minutenlang scheinbar nichts -"
    echo "  das ist normal. Bitte dieses Fenster NICHT schliessen."
    echo ""

    if [ -f "package-lock.json" ]; then
        if ! npm ci --no-audit --no-fund; then
            echo ""
            echo "Hinweis: \"npm ci\" war nicht moeglich, versuche \"npm install\"..."
            echo ""
            npm install --no-audit --no-fund
        fi
    else
        npm install --no-audit --no-fund
    fi

    if [ ! -f "node_modules/.bin/next" ]; then
        echo ""
        echo "[FEHLER] Die Installation ist unvollstaendig geblieben."
        echo ""
        echo "Das deutet fast immer auf die Internetverbindung hin."
        echo "Bitte Verbindung pruefen und diese Datei erneut starten -"
        echo "aufgeraeumt wird dann automatisch."
        echo ""
        read -r -p "Zum Beenden Enter druecken..." _
        exit 1
    fi
    echo ""
    echo "Installation abgeschlossen."
    echo ""
fi

if [ ! -f ".env.local" ]; then
    echo "Es wurden noch keine Zugangsdaten eingerichtet."
    echo "Der Einrichtungsassistent startet jetzt..."
    echo ""
    bash "scripts/cms-setup.sh"
    if [ ! -f ".env.local" ]; then
        echo ""
        echo "Einrichtung wurde abgebrochen. Der Server wird nicht gestartet."
        read -r -p "Zum Beenden Enter druecken..." _
        exit 1
    fi
    echo ""
fi

# Laeuft schon ein CMS auf Port 3000? Dann wuerde Next.js auf einen anderen
# Port ausweichen und das App-Fenster ins Leere zeigen.
#
# Das kann auch ein VERWAISTER Server aus einem vorherigen Lauf sein: wird
# das Terminalfenster geschlossen, sendet macOS SIGHUP, und ein Next.js-
# Server, der aus irgendeinem Grund nicht sauber mit heruntergefahren wurde,
# blockiert den Port dann dauerhaft. Handelt es sich erkennbar um genau
# diesen Projektordner (gleiches Arbeitsverzeichnis), wird er automatisch
# aufgeraeumt statt den Start zu blockieren. Ein fremdes Programm auf Port
# 3000 wird dagegen nicht angetastet.
repo_root="$(pwd)"
if lsof -iTCP:3000 -sTCP:LISTEN -Pn >/dev/null 2>&1; then
    stale_pid="$(lsof -tiTCP:3000 -sTCP:LISTEN -Pn 2>/dev/null | head -1)"
    stale_cwd=""
    if [ -n "$stale_pid" ]; then
        stale_cwd="$(lsof -p "$stale_pid" 2>/dev/null | awk '$4=="cwd"{print $NF; exit}')"
    fi
    if [ -n "$stale_pid" ] && [ "$stale_cwd" = "$repo_root" ]; then
        echo "Ein verwaister CMS-Server von einem vorherigen Lauf wurde gefunden"
        echo "und wird automatisch beendet..."
        pgid="$(ps -o pgid= -p "$stale_pid" 2>/dev/null | tr -d ' ')"
        if [ -n "$pgid" ]; then
            kill -TERM "-$pgid" 2>/dev/null
            sleep 1
            if lsof -iTCP:3000 -sTCP:LISTEN -Pn >/dev/null 2>&1; then
                kill -KILL "-$pgid" 2>/dev/null
                sleep 1
            fi
        fi
        echo ""
    fi
fi

if lsof -iTCP:3000 -sTCP:LISTEN -Pn >/dev/null 2>&1; then
    echo "[HINWEIS] Auf Port 3000 laeuft bereits ein Programm."
    echo "Vermutlich ist das CMS schon in einem anderen Fenster gestartet."
    echo ""
    echo "Bitte das andere CMS-Fenster schliessen und es erneut versuchen."
    echo ""
    read -r -p "Zum Beenden Enter druecken..." _
    exit 1
fi

echo "Der Server wird gestartet. Dieses Fenster waehrend der Nutzung bitte"
echo "geoeffnet lassen."
echo ""
echo "Das CMS oeffnet sich gleich automatisch in einem eigenen Fenster."
echo "Zum Beenden: dieses Fenster schliessen oder STRG+C druecken."
echo ""

bash "scripts/cms-open-app.sh" &

# Der Supervisor startet den eigentlichen Server und prueft waehrend des
# Betriebs alle paar Minuten selbststaendig auf Updates - wird eines
# gefunden, wendet er es an und startet den Server automatisch neu.
node "scripts/cms-supervisor.mjs" -p 3000

echo ""
echo "Der Server wurde beendet."
read -r -p "Zum Beenden Enter druecken..." _
