import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// Run `npm run build` before this script - it checks the production build,
// not the dev server, so results match what actually ships.
const PORT = 4173;
const baseUrl = `http://127.0.0.1:${PORT}`;

const pages = [
  "/",
  "/team",
  "/fahrzeuge",
  "/sponsoren",
  "/formula-student",
  "/news",
  "/news/saisonstart-2026",
  "/news/erfolg-fse",
  "/blog",
  "/blog/werkstatt-nachtschicht",
  "/blog/erstsemester-onboarding",
  "/galerie",
  "/erfolge",
  "/mitmachen",
  "/kontakt",
  "/impressum",
  "/datenschutz",
];

/** Kills the server's whole process group, not just the `npx` wrapper. */
function stopServer(server) {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // Not POSIX, already exited, or never got a pid — fall back to the
    // single-process kill so at least the wrapper itself is stopped.
    server.kill();
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    // `detached: true` puts this child in its own process group (POSIX).
    // `npx` itself forks the actual `next start`/`next-server` process, so
    // without this, killing just the `npx` process (see stopServer above)
    // leaves that grandchild running and bound to PORT forever — this
    // script's own process then never exits either, since its stdio pipes
    // stay open to that orphaned process.
    const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    let ready = false;
    const onData = (data) => {
      if (!ready && /Ready in/.test(data.toString())) {
        ready = true;
        resolve(server);
      }
    };
    server.stdout.on("data", onData);
    server.stderr.on("data", onData);
    server.on("error", (err) => {
      stopServer(server);
      reject(err);
    });
    setTimeout(() => {
      if (!ready) {
        stopServer(server);
        reject(new Error("Timed out waiting for `next start` to become ready"));
      }
    }, 30_000);
  });
}

// In sandboxed CI-like environments without network access for
// `npx playwright install`, a Chromium build is preinstalled outside
// Playwright's own version-pinned cache directory. Point at it explicitly
// when present; otherwise fall back to Playwright's normal resolution
// (e.g. a real CI runner with `playwright install` already run).
const preinstalledChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const launchOptions = existsSync(preinstalledChromium)
  ? { executablePath: preinstalledChromium, args: ["--no-sandbox"] }
  : {};

function checkResults(path, results) {
  if (results.violations.length > 0) {
    console.error(`\n${path}: ${results.violations.length} violation(s)`);
    for (const violation of results.violations) {
      console.error(`  [${violation.impact}] ${violation.id}: ${violation.help}`);
      for (const node of violation.nodes) {
        console.error(`    - ${node.target.join(" ")}`);
      }
    }
    return true;
  }
  console.log(`${path}: OK`);
  return false;
}

const server = await startServer();
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext();
let hasViolations = false;

try {
  for (const path of pages) {
    const page = await context.newPage();
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).analyze();
    if (checkResults(path, results)) hasViolations = true;
    await page.close();
  }
} finally {
  await browser.close();
  stopServer(server);
}

if (hasViolations) {
  console.error("\nAccessibility violations found.");
  process.exit(1);
} else {
  console.log("\nNo accessibility violations found.");
}
