import { promises as fs } from "node:fs";
import path from "node:path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
// Editors drop photos into per-purpose subfolders (single-bilder-upload/,
// Team wdp/, rollout-2026/, ...) rather than flat into public/uploads/, so
// every uploads listing needs to walk subdirectories, not just the top level.
const MAX_DEPTH = 3;

export interface UploadedFile {
  /** Path relative to public/uploads/, forward-slash separated (may include subfolders). */
  name: string;
  /** Public URL, e.g. "/uploads/single-bilder-upload/Timo.jpg". */
  path: string;
  size: number;
  mtime: number;
}

async function walk(dir: string, depth: number): Promise<UploadedFile[]> {
  if (depth > MAX_DEPTH) return [];
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const results: UploadedFile[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walk(abs, depth + 1)));
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    const stat = await fs.stat(abs);
    const relative = path.relative(UPLOADS_DIR, abs).split(path.sep).join("/");
    results.push({ name: relative, path: `/uploads/${relative}`, size: stat.size, mtime: stat.mtimeMs });
  }
  return results;
}

export async function listUploadedImages(): Promise<UploadedFile[]> {
  const files = await walk(UPLOADS_DIR, 0);
  return files.sort((a, b) => b.mtime - a.mtime);
}

// Resolves a relative uploads path (e.g. "single-bilder-upload/Timo.jpg",
// possibly with subfolders) to an absolute path inside public/uploads/, or
// null if it would escape that directory (path traversal) or doesn't use an
// allowed image extension.
export function resolveUploadPath(relativeName: string): string | null {
  if (!relativeName) return null;
  const ext = path.extname(relativeName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  const abs = path.normalize(path.join(UPLOADS_DIR, relativeName));
  if (abs !== UPLOADS_DIR && !abs.startsWith(UPLOADS_DIR + path.sep)) return null;
  return abs;
}
