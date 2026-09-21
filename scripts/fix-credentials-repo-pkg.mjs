// Workaround fuer einen Packaging-Fehler im externen "credentials-repo"
// (E-Motion-Rennteam-Aalen-e-V/Login-Benutzerverwaltung): dessen eigenes
// tsconfig.json baut mit rootDir "." und include ["src","scripts","test"],
// wodurch der Build tatsaechlich unter dist/src/index.js landet - waehrend
// package.json main/types weiterhin auf das nicht existierende dist/index.js
// zeigen. `import ... from "credentials-repo"` schlaegt dadurch fehl, bis das
// Upstream-Repo das selbst behebt. Patcht deshalb nach jedem `npm install`
// die installierte package.json auf den tatsaechlichen Pfad - idempotent und
// wird automatisch zum No-Op, sobald der Upstream-Fehler behoben ist.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const pkgDir = path.join(process.cwd(), "node_modules", "credentials-repo");
const pkgJsonPath = path.join(pkgDir, "package.json");

if (!existsSync(pkgJsonPath)) {
  process.exit(0); // Abhaengigkeit (noch) nicht installiert - z.B. vor dem ersten `npm install`.
}

if (existsSync(path.join(pkgDir, "dist", "index.js"))) {
  process.exit(0); // Upstream-Fehler behoben - nichts zu patchen.
}

const actualEntry = path.join(pkgDir, "dist", "src", "index.js");
if (!existsSync(actualEntry)) {
  console.warn("[fix-credentials-repo-pkg] Erwarteter Build-Output dist/src/index.js fehlt - Patch übersprungen.");
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
pkg.main = "dist/src/index.js";
pkg.types = "dist/src/index.d.ts";
if (pkg.exports?.["."]) {
  pkg.exports["."] = { types: "./dist/src/index.d.ts", import: "./dist/src/index.js" };
}
writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
console.log("[fix-credentials-repo-pkg] credentials-repo/package.json auf dist/src/index.js umgebogen.");
