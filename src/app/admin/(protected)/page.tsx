import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { collections } from "@/lib/cms/collections";
import { listItems } from "@/lib/cms/content";
import { getGithubConfig } from "@/lib/cms/github";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/cms/auth";
import { accessibleCollectionNames } from "@/lib/cms/roles";
import DashboardCard from "@/components/admin/DashboardCard";

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
        className={`glass-card mb-6 flex items-start gap-3 px-4 py-3 text-sm ${
          githubConnected ? "text-emerald-300" : "text-amber-300"
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
          <DashboardCard key={c.name} href={`/admin/${c.name}`} title={c.label} subtitle={c.path} count={counts[i]} icon="folder" />
        ))}

        <DashboardCard href="/admin/medien" title="Medienbibliothek" subtitle="public/uploads" count={mediaCount} icon="image" />
      </div>
    </div>
  );
}
