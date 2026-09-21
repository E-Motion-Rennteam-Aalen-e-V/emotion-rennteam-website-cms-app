@echo off
setlocal
title E-Motion Rennteam Aalen - CMS-Zugangsdaten aendern
cd /d "%~dp0"
chcp 65001 >nul

where node >nul 2>nul
if errorlevel 1 (
    echo [FEHLER] Node.js wurde nicht gefunden.
    echo Bitte installiere Node.js von https://nodejs.org/ ^(LTS-Version^)
    echo und starte dieses Fenster danach neu.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\cms-setup.ps1"

echo.
pause
