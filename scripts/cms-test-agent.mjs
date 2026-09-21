import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { chromium } from "playwright";

// Autonomous end-to-end test agent for the CMS admin app. Exercises every
// admin workflow twice over: once from a developer's angle (direct HTTP
// calls against the API routes — auth gating, status codes, malformed
// input) and once from a real editor's angle (clicking through the actual
// browser UI, the way a non-technical redactor would). Run it any time the
// CMS changes; it's meant to catch the kind of bug that only shows up when
// a whole workflow runs end-to-end (e.g. state that only breaks once a
// panel closes), which unit tests around a single component can't see.
//
// Usage: npm run build && node scripts/cms-test-agent.mjs
// Runs against the production build (`next start`), the same way
// scripts/a11y-check.mjs does — `next dev` compiles each route lazily on
// its first request, which made the very first login/navigation in this
// script arbitrarily slow (and occasionally slower than any reasonable
// timeout) depending on machine load, for no reason a real bug would cause.
// Requires .env.local with CMS_ADMIN_USER/CMS_ADMIN_PASSWORD_HASH, and
// CMS_AGENT_PASSWORD set to the plaintext password matching that hash
// (never store a plaintext password in .env.local itself).

const PORT = 4174;
const baseUrl = `http://127.0.0.1:${PORT}`;

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const ADMIN_USER = process.env.CMS_ADMIN_USER;
const ADMIN_PASSWORD = process.env.CMS_AGENT_PASSWORD;

if (!ADMIN_USER || !ADMIN_PASSWORD) {
  console.error(
    "CMS_ADMIN_USER and CMS_AGENT_PASSWORD (plaintext password matching CMS_ADMIN_PASSWORD_HASH) must be set. Skipping CMS agent run."
  );
  process.exit(0);
}

function stopServer(server) {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill();
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
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
        reject(new Error("Timed out waiting for `next start` to become ready — did you run `npm run build` first?"));
      }
    }, 30_000);
  });
}

const preinstalledChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const launchOptions = existsSync(preinstalledChromium)
  ? { executablePath: preinstalledChromium, args: ["--no-sandbox"] }
  : {};

// --- Findings collection -----------------------------------------------

const findings = [];

function record(area, description, error) {
  findings.push({ area, description, error: String(error?.message ?? error) });
  console.error(`\n[FAIL] ${area}: ${description}\n       ${String(error?.message ?? error)}`);
}

async function check(area, description, fn) {
  try {
    await fn();
    console.log(`[ok]   ${area}: ${description}`);
  } catch (err) {
    record(area, description, err);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- Developer-perspective checks: direct HTTP calls against the API ---

async function developerChecks(page) {
  const unauthRoutes = [
    ["GET", "/api/admin/content/team"],
    ["GET", "/api/admin/users"],
    ["POST", "/api/admin/upload"],
    ["GET", "/api/admin/content/team/some-slug"],
  ];
  for (const [method, path] of unauthRoutes) {
    await check("auth", `${method} ${path} without a session is rejected (401)`, async () => {
      const res = await page.request.fetch(new URL(path, baseUrl).toString(), { method });
      assert(res.status() === 401, `expected 401, got ${res.status()}`);
    });
  }

  await check("security", "path traversal in a content slug is rejected, not resolved", async () => {
    const res = await page.request.fetch(
      new URL("/api/admin/content/team/..%2f..%2f..%2fetc%2fpasswd", baseUrl).toString(),
      { method: "GET" }
    );
    assert(res.status() !== 200, `expected a non-200 rejection, got ${res.status()}`);
  });

}

// page.request (Playwright's APIRequestContext) does not reliably carry the
// browser context's session cookie for these same-origin calls, unlike a
// fetch() issued by the page itself — so authenticated checks run the fetch
// inside the page via evaluate(), the same request path the real admin UI
// uses.
async function authedFetchStatus(page, path, method = "GET") {
  return page.evaluate(
    async ([url, m]) => (await fetch(url, { method: m })).status,
    [new URL(path, baseUrl).toString(), method]
  );
}

async function developerChecksAuthenticated(page) {
  await check("data", "unknown collection name in the content API returns 404, not a crash", async () => {
    const status = await authedFetchStatus(page, "/api/admin/content/not-a-real-collection");
    assert(status === 404, `expected 404, got ${status}`);
  });
}

// --- End-user-perspective checks: driving the real browser UI ----------

// Waits on the actual login response rather than a fixed sleep, so this
// stays reliable regardless of how fast the machine running it is.
async function submitLogin(page, username, password) {
  await page.getByLabel("Benutzername").fill(username);
  await page.getByLabel("Passwort").fill(password);
  const responsePromise = page.waitForResponse((res) => res.url().endsWith("/api/admin/login"));
  await page.getByRole("button", { name: "Anmelden" }).click();
  await responsePromise;
}

async function login(page, username, password) {
  await page.goto(`${baseUrl}/admin/login`, { waitUntil: "networkidle" });
  await submitLogin(page, username, password);
}

async function logout(page) {
  await page.getByRole("button", { name: "Abmelden" }).click();
  await page.waitForURL(/\/admin\/login/, { timeout: 5000 });
}

async function endUserChecks(context) {
  const page = await context.newPage();

  await check("login", "wrong password is rejected with a visible error", async () => {
    await login(page, ADMIN_USER, "definitely-wrong-password");
    assert(await page.locator("p[role=\"alert\"]").isVisible(), "expected an error message");
  });

  await check("login", "correct credentials reach the dashboard", async () => {
    await submitLogin(page, ADMIN_USER, ADMIN_PASSWORD);
    await page.waitForURL(/\/admin$/, { timeout: 10_000 });
  });

  await developerChecksAuthenticated(page);

  // Full create -> edit -> delete round trip. Uses the "result" collection
  // because its schema has no image field, keeping the check focused on the
  // save/delete feedback flow rather than the upload widget.
  const testTitle = `CMS-Agent Test ${Date.now()}`;
  await check("content-crud", "creating an entry shows save feedback that survives the panel closing", async () => {
    await page.goto(`${baseUrl}/admin/result`, { waitUntil: "networkidle" });
    await page.getByText("+ Neuer Eintrag").click();
    await page.waitForSelector('[role="dialog"]');
    await page.getByLabel("Titel *").fill(testTitle);
    await page.getByLabel("Jahr *").fill("2026");
    await page.getByLabel("Wettbewerb *").fill("CMS-Agent Cup");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 5000 });
    // The success/warning message is rendered by the list view (outside the
    // panel) specifically so it survives the panel unmounting on save —
    // regression coverage for a bug where that feedback (including the
    // "NOT saved to GitHub" warning) was set and then immediately discarded
    // in the same tick, so an editor could never actually read it.
    const notice = page.getByRole("status");
    assert(await notice.isVisible(), "expected a status notice after saving");
    const text = await notice.textContent();
    assert(/gespeichert/i.test(text ?? ""), `expected a save confirmation, got: ${text}`);
  });

  await check("content-crud", "the created entry appears in the list after a refresh", async () => {
    await page.waitForFunction(
      (title) => document.body.textContent?.includes(title),
      testTitle,
      { timeout: 5000 }
    );
  });

  await check("content-crud", "editing the entry shows save feedback that survives the panel closing", async () => {
    await page.getByText(testTitle, { exact: false }).first().click();
    await page.waitForSelector('[role="dialog"]');
    await page.getByLabel("Platzierung").fill("1. Platz");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 5000 });
    assert(await page.getByRole("status").isVisible(), "expected a status notice after editing");
  });

  await check("content-crud", "deleting the entry shows feedback and removes it from the list", async () => {
    await page.getByText(testTitle, { exact: false }).first().click();
    await page.waitForSelector('[role="dialog"]');
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /Löschen/ }).click();
    await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 5000 });
    assert(await page.getByRole("status").isVisible(), "expected a status notice after deleting");
    await page.waitForFunction(
      (title) => !document.body.textContent?.includes(title),
      testTitle,
      { timeout: 5000 }
    );
  });

  await check("content-crud", "an object-list field (specs) can gain and lose rows", async () => {
    await page.goto(`${baseUrl}/admin/vehicle`, { waitUntil: "networkidle" });
    await page.getByText("+ Neuer Eintrag").click();
    await page.waitForSelector('[role="dialog"]');
    await page.getByText("+ Zeile hinzufügen").click();
    await page.getByText("+ Zeile hinzufügen").click();
    const rows = page.locator('input[placeholder="Bezeichnung"]');
    assert((await rows.count()) === 2, `expected 2 rows, got ${await rows.count()}`);
    await page.getByRole("button", { name: "Entfernen" }).first().click();
    assert((await rows.count()) === 1, `expected 1 row after removal, got ${await rows.count()}`);
    page.once("dialog", (d) => d.accept());
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 5000 });
  });

  await check("content-crud", "unsaved changes prompt for confirmation before discarding", async () => {
    await page.goto(`${baseUrl}/admin/team`, { waitUntil: "networkidle" });
    await page.getByText("+ Neuer Eintrag").click();
    await page.waitForSelector('[role="dialog"]');
    await page.getByLabel("Name *").fill("CMS-Agent Dirty Check");
    let confirmSeen = false;
    page.once("dialog", (d) => {
      confirmSeen = true;
      d.dismiss();
    });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    assert(confirmSeen, "expected a confirm() prompt before discarding unsaved edits");
    assert(await page.locator('[role="dialog"]').isVisible(), "panel should stay open once the discard is declined");
    page.once("dialog", (d) => d.accept());
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 5000 });
  });

  // User management: create a secondary account, verify its forced
  // password-change and permission scoping, then clean it up again.
  const secondaryUser = `cms-agent-${Date.now()}`;
  await check("users", "admin can create a secondary editor account", async () => {
    await page.goto(`${baseUrl}/admin/benutzer`, { waitUntil: "networkidle" });
    await page.getByLabel("Benutzername").fill(secondaryUser);
    await page.getByLabel("Temporäres Passwort").fill("temporarypw1");
    await page.getByRole("button", { name: "Benutzer anlegen" }).click();
    await page.waitForTimeout(500);
    assert(await page.getByText(/wurde angelegt/).isVisible(), "expected a creation confirmation");
  });

  await check("users", "a new account is forced to change its password on first login", async () => {
    await logout(page);
    await login(page, secondaryUser, "temporarypw1");
    await page.waitForURL(/passwort-aendern/, { timeout: 5000 });
  });

  await check("users", "a non-admin account cannot reach user management", async () => {
    await page.goto(`${baseUrl}/admin/benutzer`, { waitUntil: "networkidle" });
    assert(!page.url().includes("/admin/benutzer"), `expected a redirect away from /admin/benutzer, still at ${page.url()}`);
  });

  await check("users", "a non-admin account is rejected by the users API directly", async () => {
    const status = await authedFetchStatus(page, "/api/admin/users");
    assert(status === 403, `expected 403, got ${status}`);
  });

  await check("users", "completing the forced password change reaches the dashboard", async () => {
    await page.goto(`${baseUrl}/admin/passwort-aendern`, { waitUntil: "networkidle" });
    await page.getByLabel("Neues Passwort").fill("neuespasswort1");
    await page.getByLabel("Passwort wiederholen").fill("neuespasswort1");
    await page.getByRole("button", { name: "Passwort speichern" }).click();
    await page.waitForURL(/\/admin$/, { timeout: 5000 });
    assert(!(await page.getByText("Benutzerverwaltung").isVisible()), "non-admin sidebar should not show user management");
  });

  await check("users", "admin can remove the secondary account, and its login then fails", async () => {
    await logout(page);
    await login(page, ADMIN_USER, ADMIN_PASSWORD);
    await page.waitForURL(/\/admin$/, { timeout: 5000 });
    await page.goto(`${baseUrl}/admin/benutzer`, { waitUntil: "networkidle" });
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Entfernen" }).click();
    await page.waitForTimeout(500);
    assert(!(await page.getByText(secondaryUser).isVisible()), "deleted user should no longer be listed");

    await logout(page);
    await login(page, secondaryUser, "neuespasswort1");
    await page.waitForTimeout(500);
    assert(await page.locator("p[role=\"alert\"]").isVisible(), "expected login to fail for a deleted account");
  });

  await page.close();
}

// --- Run ------------------------------------------------------------------

const server = await startServer();
const browser = await chromium.launch(launchOptions);
const context = await browser.newContext();
context.setDefaultTimeout(10_000);

try {
  const page = await context.newPage();
  await developerChecks(page);
  await page.close();
  await endUserChecks(context);
} finally {
  await browser.close();
  stopServer(server);
  // Best-effort cleanup of the temporary secondary account file in case a
  // check failed partway through and left it behind.
  if (existsSync(".cms-users.json")) {
    try {
      const store = JSON.parse(readFileSync(".cms-users.json", "utf-8"));
      const leftovers = (store.users ?? []).filter((u) => u.username.startsWith("cms-agent-"));
      if (leftovers.length && leftovers.length === store.users.length) unlinkSync(".cms-users.json");
    } catch {
      // ignore
    }
  }
}

console.log(`\n${findings.length === 0 ? "All CMS workflow checks passed." : `${findings.length} issue(s) found:`}`);
for (const f of findings) {
  console.log(`  - [${f.area}] ${f.description}: ${f.error}`);
}
process.exit(findings.length === 0 ? 0 : 1);
