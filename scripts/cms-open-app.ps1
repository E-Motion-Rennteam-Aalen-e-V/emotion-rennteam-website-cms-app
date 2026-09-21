# Oeffnet das CMS als eigenstaendiges App-Fenster (ohne Adressleiste, Tabs und
# Lesezeichenleiste), damit es sich wie eine richtige Desktop-Anwendung anfuehlt.
# Wird von CMS-Start.bat im Hintergrund gestartet, waehrend der Server hochfaehrt.
#
# Es gibt bewusst KEINE lokale Ladeseite (frueher scripts/cms-loading.html)
# mehr: die wartete selbst mit einem eigenen 180-Sekunden-Timeout, und auf
# manchen Windows-Rechnern (langsamer erster Turbopack-Compile, Antivirus-
# Scan der node_modules) dauert der Serverstart laenger als das - die
# Ladeseite zeigte dann faelschlich "Der Server antwortet nicht", obwohl der
# Server kurz danach ganz normal fertig wurde. Stattdessen wartet dieses
# Skript hier (unsichtbar, da es bereits minimiert gestartet wird) direkt auf
# den Server und oeffnet das Browser-Fenster erst, wenn er tatsaechlich
# antwortet - ohne Zwischenseite und ohne eigenes Zeitlimit.

$ErrorActionPreference = "SilentlyContinue"

$PORT = 3000
$TARGET = "http://localhost:$PORT/admin/login"

function Test-ServerReady {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $task = $client.BeginConnect("localhost", $PORT, $null, $null)
        $ok = $task.AsyncWaitHandle.WaitOne(1000)
        if ($ok -and $client.Connected) {
            $client.EndConnect($task)
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    } catch {
        return $false
    }
}

# Kein Zeitlimit hier: der Server startet garantiert irgendwann (oder das
# Konsolenfenster von CMS-Start.bat zeigt einen Fehler an) - lieber laenger
# warten als eine falsche Fehlermeldung zeigen.
while (-not (Test-ServerReady)) {
    Start-Sleep -Milliseconds 500
}

$candidatePaths = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$browserExe = $null
foreach ($candidate in $candidatePaths) {
    if ($candidate -and (Test-Path $candidate)) {
        $browserExe = $candidate
        break
    }
}

if ($browserExe) {
    # --app=<url> startet ein eigenes Fenster ohne Browser-Bedienelemente.
    Start-Process -FilePath $browserExe -ArgumentList @(
        "--app=$TARGET",
        "--window-size=1360,900"
    )
} else {
    # Weder Edge noch Chrome gefunden: normaler Standardbrowser als Rueckfall.
    Start-Process $TARGET
}
