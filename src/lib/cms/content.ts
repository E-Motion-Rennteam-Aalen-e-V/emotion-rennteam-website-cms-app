import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import matter from "gray-matter";
import { getCollection, type CollectionDef } from "./collections";
import { commitFile, commitBinaryFile, deleteFile as githubDeleteFile, getGithubConfig } from "./github";

const ROOT = process.cwd();
const execFileAsync = promisify(execFile);

// Must match the marker cms-update.sh/.ps1 look for to peel off this commit
// again before their own fast-forward-only merge (see the comment there).
const CONTENT_SYNC_MARKER = "[cms-content-sync]";

/**
 * A CMS save writes straight to disk (see below) and commits via the GitHub
 * API - it never touches the local git index. Left alone, that permanently
 * dirties the local working tree relative to local HEAD, and cms-update.sh/
 * .ps1's "are there local changes?" guard then refuses to fast-forward ever
 * again, even though the exact same change already exists as a real commit
 * on GitHub. Fold the just-written path into a local, never-pushed marker
 * commit (reusing the existing "[cms-content-sync]" convention, which
 * cms-update.sh/.ps1 already knows to strip off before its own update
 * check) so `git status` goes clean again right away. Best-effort and
 * silent: if git isn't installed/available here, the GitHub commit above is
 * already the source of truth, so this is a nicety, not a requirement.
 */
async function syncLocalGitAfterCommit(relPath: string): Promise<void> {
  try {
    const git = (args: string[]) => execFileAsync("git", args, { cwd: ROOT, timeout: 5000 });

    await git(["rev-parse", "--is-inside-work-tree"]);
    await git(["add", "--", relPath]);

    const { stdout: staged } = await git(["diff", "--cached", "--name-only"]);
    if (!staged.trim()) return; // Nothing actually changed (e.g. re-saving identical content).

    await git([
      "-c",
      "user.name=CMS Auto-Sync",
      "-c",
      "user.email=cms-sync@localhost",
      "commit",
      "--quiet",
      "-m",
      CONTENT_SYNC_MARKER,
    ]);
  } catch {
    // Best effort only - see comment above.
  }
}

export interface ContentItem {
  slug: string;
  data: Record<string, unknown>;
  body: string;
}

export interface SaveResult {
  committedToGithub: boolean;
  commitUrl: string | null;
  warning?: string;
}

// Slugs end up in filesystem paths (path.join(ROOT, collection.path, `${slug}.md`))
// and as-is in GitHub Contents API paths. slugify() only ever produces safe
// values, but getItem/saveItem/deleteItem also accept a slug straight from
// the URL's dynamic route segment (editing/deleting an existing item) —
// without this check, a crafted slug like "../../../etc/passwd" or one
// containing an encoded slash could read, overwrite, or delete files outside
// the intended content directory, including in the GitHub repo itself.
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return VALID_SLUG.test(slug);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "eintrag";
}

async function readDirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

export async function listItems(collectionName: string): Promise<ContentItem[]> {
  const collection = getCollection(collectionName);
  if (!collection) throw new Error(`Unbekannte Collection: ${collectionName}`);
  const dir = path.join(/* turbopackIgnore: true */ ROOT, collection.path);
  const files = (await readDirSafe(dir)).filter((f) => f.endsWith(".md"));
  // Eine einzelne defekte Datei darf die Redaktion nicht aussperren - sonst
  // laesst sich die Liste, mit der man genau diese Datei reparieren wuerde,
  // gar nicht mehr oeffnen. Kaputte Eintraege werden uebersprungen und geloggt.
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf-8");
        const parsed = matter(raw);
        return { slug: file.replace(/\.md$/, ""), data: parsed.data, body: parsed.content.trim() };
      } catch (error) {
        console.error(`[cms] Ueberspringe defekte Datei ${collectionName}/${file}:`, error);
        return null;
      }
    })
  );
  const items = results.filter((item): item is ContentItem => item !== null);
  return items.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getItem(collectionName: string, slug: string): Promise<ContentItem | null> {
  const collection = getCollection(collectionName);
  if (!collection) throw new Error(`Unbekannte Collection: ${collectionName}`);
  if (!isValidSlug(slug)) return null;
  const filePath = path.join(/* turbopackIgnore: true */ ROOT, collection.path, `${slug}.md`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = matter(raw);
    return { slug, data: parsed.data, body: parsed.content.trim() };
  } catch {
    return null;
  }
}

function serialize(data: Record<string, unknown>, body: string): string {
  return matter.stringify(body ? `\n${body}\n` : "\n", data);
}

/** Thrown for invalid/incomplete input, as opposed to storage/network failures. */
export class ValidationError extends Error {}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

/**
 * The admin UI already enforces `required` client-side, but that alone
 * leaves the server accepting incomplete data straight from the API - e.g.
 * a vehicle without `year` or a news post without `date` silently breaks
 * the `b.year - a.year` / `new Date(b.date)` sort used on the live site
 * (NaN, not a crash, just a wrong/undeterministic order). Enforce the same
 * `required` fields server-side so that can't happen.
 */
function validateRequiredFields(
  collection: CollectionDef,
  data: Record<string, unknown>,
  body: string
): void {
  for (const field of collection.fields) {
    if (!field.required) continue;
    const value = field.isBody ? body : data[field.name];
    if (isEmptyValue(value)) {
      throw new ValidationError(`Pflichtfeld "${field.label}" fehlt oder ist leer.`);
    }
  }
}

export async function saveItem(
  collectionName: string,
  slug: string,
  data: Record<string, unknown>,
  body: string,
  authorName: string
): Promise<SaveResult> {
  const collection = getCollection(collectionName);
  if (!collection) throw new Error(`Unbekannte Collection: ${collectionName}`);
  // Muss vor der Slug-Pruefung laufen: beim Anlegen (POST .../[collection])
  // wird der Slug aus dem Titelfeld abgeleitet, das fehlt/leer ist, wenn ein
  // Pflichtfeld fehlt (z.B. Titel leer). Sonst schlaegt hier zuerst die
  // Slug-Pruefung mit einer generischen "Ungueltiger Slug"-Meldung (-> 502)
  // an, statt der eigentlichen, aussagekraeftigen Pflichtfeld-Meldung (-> 400).
  validateRequiredFields(collection, data, body);
  if (!isValidSlug(slug)) throw new Error(`Ungültiger Slug: "${slug}"`);
  const relPath = path.join(collection.path, `${slug}.md`).split(path.sep).join("/");
  const content = serialize(data, body);

  // Best-effort local write so the running dev instance reflects the change
  // immediately. This does not persist on most serverless hosts, which is
  // why the GitHub commit below is the source of truth.
  try {
    const absPath = path.join(/* turbopackIgnore: true */ ROOT, relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, "utf-8");
  } catch {
    // ignore (read-only filesystem in some deployments)
  }

  if (!getGithubConfig()) {
    return {
      committedToGithub: false,
      commitUrl: null,
      warning:
        "GitHub-Anbindung ist nicht konfiguriert (GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO). Änderung wurde nur lokal gespeichert und ist NICHT auf GitHub gesichert.",
    };
  }

  const { commitUrl } = await commitFile(
    relPath,
    content,
    `cms: ${collection.label} "${slug}" aktualisieren`,
    authorName
  );
  await syncLocalGitAfterCommit(relPath);
  return { committedToGithub: true, commitUrl };
}

export async function deleteItem(collectionName: string, slug: string, authorName: string): Promise<SaveResult> {
  const collection = getCollection(collectionName);
  if (!collection) throw new Error(`Unbekannte Collection: ${collectionName}`);
  if (!isValidSlug(slug)) throw new Error(`Ungültiger Slug: "${slug}"`);
  const relPath = path.join(collection.path, `${slug}.md`).split(path.sep).join("/");

  try {
    await fs.unlink(path.join(/* turbopackIgnore: true */ ROOT, relPath));
  } catch {
    // ignore
  }

  if (!getGithubConfig()) {
    return {
      committedToGithub: false,
      commitUrl: null,
      warning: "GitHub-Anbindung ist nicht konfiguriert. Löschung wurde nur lokal ausgeführt.",
    };
  }

  await githubDeleteFile(relPath, `cms: ${collection.label} "${slug}" löschen`, authorName);
  await syncLocalGitAfterCommit(relPath);
  return { committedToGithub: true, commitUrl: null };
}

// The extension written to disk must come from this fixed, server-controlled
// mapping — never from the client-supplied filename. `file.type` on the
// upload route is only checked against an allowlist of MIME *values*; an
// attacker can freely set the multipart Content-Type of a form field to
// whatever they like while keeping any filename (e.g. send bytes for
// "evil.html" with a forged `Content-Type: image/png`). If the extension
// were taken from that filename, the allowlist would do nothing to stop an
// arbitrary extension (including .html/.js) from landing in the
// publicly-served public/uploads/ directory. SVG is intentionally not in
// this map — see ALLOWED_TYPES in the upload route for why.
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function extensionForMimeType(mimeType: string): string | null {
  return MIME_EXTENSIONS[mimeType] ?? null;
}

export async function saveUploadedImage(
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
  authorName: string
): Promise<{ publicPath: string } & SaveResult> {
  const extension = extensionForMimeType(mimeType);
  if (!extension) throw new Error(`Nicht unterstützter Dateityp: "${mimeType}"`);
  const safeName = `${Date.now()}-${slugify(fileName.replace(/\.[^/.]+$/, ""))}${extension}`;
  const relPath = `public/uploads/${safeName}`;
  const publicPath = `/uploads/${safeName}`;

  try {
    const absPath = path.join(/* turbopackIgnore: true */ ROOT, relPath);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, bytes);
  } catch {
    // ignore
  }

  if (!getGithubConfig()) {
    return {
      publicPath,
      committedToGithub: false,
      commitUrl: null,
      warning:
        "GitHub-Anbindung ist nicht konfiguriert. Bild wurde nur lokal gespeichert und ist NICHT auf GitHub gesichert.",
    };
  }

  const { commitUrl } = await commitBinaryFile(relPath, bytes, `cms: Bild "${safeName}" hochladen`, authorName);
  await syncLocalGitAfterCommit(relPath);
  return { publicPath, committedToGithub: true, commitUrl };
}
