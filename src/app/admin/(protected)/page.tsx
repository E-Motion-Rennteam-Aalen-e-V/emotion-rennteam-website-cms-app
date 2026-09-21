import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { collections } from "@/lib/cms/collections";
import { listItems } from "@/lib/cms/content";
import { getGithubConfig } from "@/lib/cms/github";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/cms/auth";
import { accessibleCollectionNames } from "@/lib/cms/roles";

const ALLOWED_MEDIA_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

async function countUploads(): Promise<number> {
  try {
    const entries = await fs.readdir(path.join(process.cwd(), "public", "uploads"), { withFileTypes: true });
    return entries.filter((e) => e.isFile() && ALLOWED_MEDIA_EXTENSIONS.has(path.extname(e.name).toLowerCase())).length;
  } catch {
    return 0;
  }
}

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  const visibleCollectionNames = new Set(
    accessibleCollectionNames(session ?? { username: "" }, collections.map((c) => c.name))
  );
  const visibleCollections = collections.filter((c) => visibleCollectionNames.has(c.name));

  const [counts, mediaCount] = await Promise.all([
    Promise.all(visibleCollections.map((c) => listItems(c.name).then((items) => items.length))),
    countUploads(),
  ]);
  const githubConnected = Boolean(getGithubConfig());

  return (
    <div>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Übersicht</h1>
        <p className="text-sm text-muted">Wähle einen Inhaltsbereich aus, um Texte und Bilder zu bearbeiten.</p>
      </div>

      <div
        className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          githubConnected
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
        }`}
      >
        <span aria-hidden>{githubConnected ? "✓" : "!"}</span>
        <p>
          {githubConnected
            ? "GitHub-Anbindung aktiv – jede Speicherung wird automatisch als Commit ins Repository geschrieben."
            : "GitHub-Anbindung ist nicht konfiguriert (GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO fehlen). Änderungen werden nur lokal gespeichert und nicht auf GitHub gesichert."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCollections.map((c, i) => (
          <Link
            key={c.name}
            href={`/admin/${c.name}`}
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground group-hover:text-accent-text">{c.label}</h2>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{counts[i]}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted">{c.path}</p>
          </Link>
        ))}

        {/* Media library card */}
        <Link
          href="/admin/medien"
          className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground group-hover:text-accent-text">Medienbibliothek</h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">{mediaCount}</span>
          </div>
          <p className="mt-1.5 text-xs text-muted">public/uploads</p>
        </Link>
      </div>
    </div>
  );
}
