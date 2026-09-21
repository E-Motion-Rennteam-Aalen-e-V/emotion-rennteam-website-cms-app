#!/usr/bin/env node
// Startet den Next.js-Server als Kindprozess. Kein Update-Check beim Start -
// der Server ist sofort da. Erst wenn sich jemand einloggt und im
// Admin-Panel landet, legt UpdateBanner.tsx (per
// /api/admin/trigger-update-check) die Trigger-Datei ".cms-update-trigger"
// an; dieses Skript pollt kurz darauf, findet sie, prueft dann im
// Hintergrund einmalig auf GitHub-Updates und haelt danach die periodische
// 5-Minuten-Pruefung am Laufen, solange die App laeuft - ohne den Start
// selbst je zu verzoegern oder die Redaktion beim Arbeiten zu stoeren.
//
// Wird ein Update gefunden, wendet dieses Skript es an (per
// scripts/cms-update.sh bzw. .ps1 - dieselbe, bereits beim Start verwendete
// Update-Logik, inkl. Inhalte-Abgleich). Bei echten Code-Aenderungen wird der
// laufende Server bewusst NICHT live neu gestartet - das wuerde eine
// eingeloggte Redaktion mitten in der Arbeit aus der Sitzung werfen. Der
// neue Code liegt danach einfach auf der Platte und wird automatisch aktiv,
// sobald das CMS das naechste Mal gestartet wird. Reine Inhalte-Aenderungen
// (ueber das CMS gespeicherte Texte/Bilder) brauchen ohnehin nie einen
// Neustart, da diese bei jeder Anfrage frisch von der Festplatte gelesen
// werden.
//
// Der aktuelle Status wird in ".cms-update-status.json" im Projektordner
// abgelegt; das Admin-Panel liest diese Datei ueber /api/admin/update-status
// und zeigt der Redaktion einen Hinweis, wenn ein Update angewendet wird.
//
// Schlaegt eine Pruefung fehl (kein Internet, lokale Aenderungen, Konflikt),
// laeuft der Server einfach mit der vorhandenen Version weiter - der Betrieb
// wird dadurch nie unterbrochen.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const statusFile = path.join(repoRoot, ".cms-update-status.json");
const triggerFile = path.join(repoRoot, ".cms-update-trigger");
const isWin = process.platform === "win32";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const TRIGGER_POLL_MS = 3000;

const portIndex = process.argv.indexOf("-p");
const port = portIndex !== -1 ? process.argv[portIndex + 1] : "3000";

let child = null;
let shuttingDown = false;
let backgroundChecksStarted = false;

function writeStatus(status, extra = {}) {
  try {
    writeFileSync(statusFile, JSON.stringify({ status, checkedAt: new Date().toISOString(), ...extra }));
  } catch {
    // Nur informativ fuers Admin-Panel - darf den Betrieb nie stoeren.
  }
}

function isGitAvailable() {
  try {
    const r = spawnSync("git", ["--version"], {
      cwd: repoRoot,
      stdio: "pipe",
      shell: isWin,
      timeout: 2000,
    });
    return r.status === 0 && !r.error;
  } catch {
    return false;
  }
}

function runGitCommand(args) {
  try {
    const r = spawnSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: isWin,
      timeout: 5000,
    });
    return r.status === 0 ? r.stdout.trim() : null;
  } catch {
    return null;
  }
}

function currentHead() {
  return runGitCommand(["rev-parse", "HEAD"]);
}

function runAsync(cmd, args) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: repoRoot, stdio: "inherit", shell: isWin });
    p.on("close", (code) => resolve(code ?? 0));
    p.on("error", () => resolve(1));
  });
}

function startServer() {
  child = spawn("npm", ["run", "dev", "--", "-p", port], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: isWin,
    detached: !isWin,
  });
  child.on("exit", (code) => {
    if (!shuttingDown) process.exit(code ?? 0);
  });
}

async function checkForUpdate() {
  if (!existsSync(path.join(repoRoot, ".git"))) {
    writeStatus("git-repo-missing");
    return;
  }

  if (!isGitAvailable()) {
    writeStatus("git-not-available", {
      error: "Git ist nicht installiert oder nicht erreichbar",
      hint: "Zur Aktivierung von Auto-Updates: Git installieren und neu starten",
    });
    return;
  }

  const before = currentHead();
  writeStatus("checking");

  const updateScript = isWin
    ? { cmd: "powershell", args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/cms-update.ps1"] }
    : { cmd: "bash", args: ["scripts/cms-update.sh"] };
  await runAsync(updateScript.cmd, updateScript.args);

  const after = currentHead();
  if (!before || !after || before === after) {
    writeStatus("up-to-date");
    return;
  }

  // Nur bei tatsaechlichen Code-Aenderungen ueberhaupt etwas melden - ein
  // reiner Inhalte-Abgleich (content/) wird ohne Neustart sofort wirksam, da
  // Inhalte bei jeder Anfrage frisch von der Festplatte gelesen werden.
  const diff = runGitCommand(["diff", "--name-only", before, after]);
  const changedFiles = (diff || "").split("\n").filter(Boolean);
  const onlyContent = changedFiles.length > 0 && changedFiles.every((f) => f.startsWith("content/"));
  if (onlyContent) {
    writeStatus("up-to-date");
    return;
  }

  const pkgChanged = changedFiles.some((f) => f === "package.json" || f === "package-lock.json");
  if (pkgChanged) {
    writeStatus("installing-dependencies");
    const hasLock = existsSync(path.join(repoRoot, "package-lock.json"));
    await runAsync("npm", [hasLock ? "ci" : "install", "--no-audit", "--no-fund"]);
  }

  // Der neue Code liegt jetzt auf der Platte (git pull s.o.), aber der
  // laufende Server-Prozess haelt weiterhin den alten Code im Speicher.
  // Bewusst KEIN Live-Neustart hier: das wuerde eine eingeloggte Redaktion
  // mitten in der Arbeit aus der Sitzung werfen. Der neue Code wird
  // stattdessen automatisch aktiv, sobald das CMS das naechste Mal gestartet
  // wird (naechster CMS-Start.bat/.sh/.command-Aufruf) - startServer() laeuft
  // dann ohnehin gegen den bereits aktualisierten Stand.
  writeStatus("updated", { appliedAt: new Date().toISOString() });
}

function startBackgroundChecks() {
  if (backgroundChecksStarted) return;
  backgroundChecksStarted = true;
  checkForUpdate().catch(() => writeStatus("up-to-date"));
  setInterval(() => {
    checkForUpdate().catch(() => writeStatus("up-to-date"));
  }, CHECK_INTERVAL_MS);
}

// Wartet, bis jemand eingeloggt im Admin-Panel ankommt (UpdateBanner.tsx
// legt dann ueber /api/admin/trigger-update-check diese Datei an), statt
// selbst sofort beim Start zu pruefen - so wird der Start-Vorgang nie durch
// einen Update-Check verzoegert oder gestoert.
try {
  if (existsSync(triggerFile)) unlinkSync(triggerFile);
} catch {
  // Kein Problem, wird beim naechsten Poll erneut versucht.
}
setInterval(() => {
  if (backgroundChecksStarted) return;
  if (!existsSync(triggerFile)) return;
  try {
    unlinkSync(triggerFile);
  } catch {
    // Datei ggf. schon weg - trotzdem Checks starten.
  }
  startBackgroundChecks();
}, TRIGGER_POLL_MS);

writeStatus("up-to-date");
startServer();

function shutdown(signal) {
  shuttingDown = true;
  if (child) {
    if (isWin) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    } else {
      try {
        process.kill(-child.pid, signal);
      } catch {
        try {
          child.kill(signal);
        } catch {
          // Prozess bereits beendet.
        }
      }
    }
  }
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
// Closing the Terminal/Konsole window this runs in (macOS Terminal.app,
// most Linux terminal emulators) sends SIGHUP to the foreground process
// when its controlling terminal goes away - without a handler, Node's
// default action is to terminate immediately, skipping shutdown() entirely.
// The Next.js server child is started with `detached: true` (needed so
// shutdown() can signal its whole process group at once) precisely
// because it can outlive this process; without catching SIGHUP too, that
// detached child becomes a permanent orphan still holding the port after
// every single window close, forcing every next start to fail with
// "port already in use". No effect on Windows (SIGHUP doesn't apply there).
if (!isWin) process.on("SIGHUP", () => shutdown("SIGHUP"));
