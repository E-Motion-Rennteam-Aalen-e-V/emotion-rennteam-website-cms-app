@echo off
setlocal
title E-Motion Rennteam Aalen - CMS starten
cd /d "%~dp0"

echo ============================================
echo   E-Motion Rennteam Aalen - Redaktions-CMS
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [FEHLER] Node.js wurde nicht gefunden.
    echo Bitte installiere Node.js von https://nodejs.org/ ^(LTS-Version^)
    echo und starte dieses Fenster danach neu.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [FEHLER] npm wurde nicht gefunden, obwohl Node.js vorhanden ist.
    echo Bitte installiere Node.js von https://nodejs.org/ neu ^(LTS-Version^)
    echo und starte dieses Fenster danach neu.
    echo.
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [FEHLER] Diese Datei liegt nicht im Projektordner.
    echo CMS-Start.bat muss im selben Ordner liegen wie "package.json".
    echo.
    pause
    exit /b 1
)

REM Informative Warnung wenn Git fehlt (blockiert NOT)
where git >nul 2>nul
if errorlevel 1 (
    echo [HINWEIS] Git ist nicht installiert.
    echo Automatische Updates sind deaktiviert.
    echo Zum Aktivieren: Git installieren von https://git-scm.com/
    echo.
)

REM Der Update-Check laeuft NICHT mehr hier im Vordergrund - das wuerde den
REM Start unnoetig verzoegern, bevor ueberhaupt etwas zu sehen ist. Stattdessen
REM prueft scripts\cms-supervisor.mjs direkt beim Start (und danach alle paar
REM Minuten) im Hintergrund auf Updates, waehrend der Server bereits laeuft -
REM man landet dadurch sofort auf der Login-Seite.

REM Nur die tatsaechlich vorhandene next-Startdatei zaehlt. Ein blosser
REM node_modules-Ordner kann von einem abgebrochenen Lauf uebrig sein.
if not exist "node_modules\.bin\next.cmd" (
    REM Reste eines abgebrochenen Laufs automatisch entfernen, sonst bleibt
    REM die Installation erneut unvollstaendig.
    if exist "node_modules" (
        echo Eine unvollstaendige Installation wurde gefunden und wird
        echo aufgeraeumt. Das dauert einen Moment...
        rmdir /s /q "node_modules"
        if exist "node_modules" (
            echo.
            echo [FEHLER] Der Ordner "node_modules" liess sich nicht loeschen.
            echo Vermutlich laeuft das CMS noch in einem anderen Fenster.
            echo.
            echo Bitte alle anderen CMS-Fenster schliessen und diese Datei
            echo erneut starten.
            echo.
            pause
            exit /b 1
        )
        echo Aufgeraeumt.
        echo.
    )

    echo Abhaengigkeiten werden installiert.
    echo.
    echo   WICHTIG: Das dauert beim ersten Mal 2 bis 10 Minuten.
    echo   Waehrenddessen passiert oft minutenlang scheinbar nichts -
    echo   das ist normal. Bitte dieses Fenster NICHT schliessen.
    echo.

    if exist "package-lock.json" (
        call npm ci --no-audit --no-fund
        if errorlevel 1 (
            echo.
            echo Hinweis: "npm ci" war nicht moeglich, versuche "npm install"...
            echo.
            call npm install --no-audit --no-fund
        )
    ) else (
        call npm install --no-audit --no-fund
    )

    if not exist "node_modules\.bin\next.cmd" (
        echo.
        echo [FEHLER] Die Installation ist unvollstaendig geblieben.
        echo.
        echo Das deutet fast immer auf die Internetverbindung hin.
        echo Bitte Verbindung pruefen und diese Datei erneut starten -
        echo aufgeraeumt wird dann automatisch.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Installation abgeschlossen.
    echo.
)

if not exist ".env.local" (
    echo Es wurden noch keine Zugangsdaten eingerichtet.
    echo Der Einrichtungsassistent startet jetzt...
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\cms-setup.ps1"
    if not exist ".env.local" (
        echo.
        echo Einrichtung wurde abgebrochen. Der Server wird nicht gestartet.
        pause
        exit /b 1
    )
    echo.
)

REM Laeuft schon ein CMS auf Port 3000? Dann wuerde Next.js auf einen anderen
REM Port ausweichen und das App-Fenster ins Leere zeigen.
netstat -ano | findstr /C:":3000 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo [HINWEIS] Auf Port 3000 laeuft bereits ein Programm.
    echo Vermutlich ist das CMS schon in einem anderen Fenster gestartet.
    echo.
    echo Bitte das andere CMS-Fenster schliessen und es erneut versuchen.
    echo.
    pause
    exit /b 1
)

echo Der Server wird gestartet. Dieses Fenster waehrend der Nutzung bitte
echo geoeffnet lassen.
echo.
echo Das CMS oeffnet sich gleich automatisch in einem eigenen Fenster.
echo Zum Beenden: dieses Fenster schliessen oder STRG+C druecken.
echo.

start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\cms-open-app.ps1"

REM Der Supervisor startet den eigentlichen Server und prueft waehrend des
REM Betriebs alle paar Minuten selbststaendig auf Updates - wird eines
REM gefunden, wendet er es an und startet den Server automatisch neu.
call node "scripts\cms-supervisor.mjs" -p 3000

echo.
echo Der Server wurde beendet.
pause
