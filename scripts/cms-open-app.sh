#!/bin/bash
# Oeffnet das CMS als eigenstaendiges App-Fenster (ohne Adressleiste, Tabs und
# Lesezeichenleiste), damit es sich wie eine richtige Desktop-Anwendung anfuehlt.
# macOS/Linux-Gegenstueck zu scripts/cms-open-app.ps1.
# Wird von CMS-Start.command / CMS-Start.sh im Hintergrund gestartet, waehrend
# der Server hochfaehrt.
#
# Es gibt bewusst KEINE lokale Ladeseite (frueher scripts/cms-loading.html)
# mehr - siehe cms-open-app.ps1 fuer die ausfuehrliche Begruendung. Dieses
# Skript wartet stattdessen selbst (unsichtbar im Hintergrund, siehe "&" beim
# Aufruf) direkt auf den Server und oeffnet das Browser-Fenster erst, wenn er
# tatsaechlich antwortet.

PORT=3000
loading_url="http://localhost:$PORT/admin/login"

wait_for_server() {
    # Kein Zeitlimit: der Server startet garantiert irgendwann (oder das
    # Terminalfenster von CMS-Start.sh/.command zeigt einen Fehler an).
    while true; do
        if command -v curl >/dev/null 2>&1; then
            curl -s -o /dev/null --max-time 1 "$loading_url" && return 0
        else
            # Kein curl vorhanden: bloss pruefen, ob ueberhaupt jemand auf
            # dem Port lauscht (kein echter HTTP-Request).
            (exec 3<>"/dev/tcp/localhost/$PORT") 2>/dev/null && exec 3<&- 3>&- && return 0
        fi
        sleep 0.5
    done
}

wait_for_server

open_macos() {
    local chrome_app="/Applications/Google Chrome.app"
    local edge_app="/Applications/Microsoft Edge.app"
    if [ -d "$chrome_app" ]; then
        open -na "Google Chrome" --args "--app=$loading_url" "--window-size=1360,900"
    elif [ -d "$edge_app" ]; then
        open -na "Microsoft Edge" --args "--app=$loading_url" "--window-size=1360,900"
    else
        # Weder Chrome noch Edge gefunden: normaler Standardbrowser als Rueckfall.
        open "$loading_url"
    fi
}

open_linux() {
    local browser=""
    for candidate in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge microsoft-edge-stable; do
        if command -v "$candidate" >/dev/null 2>&1; then
            browser="$candidate"
            break
        fi
    done
    if [ -n "$browser" ]; then
        # --app=<url> startet ein eigenes Fenster ohne Browser-Bedienelemente,
        # genau wie unter macOS/Windows. nohup + disown, damit das Fenster
        # offen bleibt, wenn dieses Skript (und damit sein Elternprozess)
        # endet.
        nohup "$browser" --app="$loading_url" --window-size=1360,900 >/dev/null 2>&1 &
        disown
    elif command -v xdg-open >/dev/null 2>&1; then
        # Kein Chromium-basierter Browser gefunden: normaler Standardbrowser
        # als Rueckfall (kein App-Fenster, aber funktioniert ueberall).
        nohup xdg-open "$loading_url" >/dev/null 2>&1 &
        disown
    fi
}

case "$(uname -s)" in
    Darwin)
        open_macos
        ;;
    Linux)
        open_linux
        ;;
    *)
        # Unbekanntes System (z.B. WSL, BSD): bestmoeglicher Versuch.
        command -v xdg-open >/dev/null 2>&1 && xdg-open "$loading_url" >/dev/null 2>&1 &
        ;;
esac
