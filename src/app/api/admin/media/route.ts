import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { getSessionUser } from "@/lib/cms/auth";
import { deleteFile as githubDeleteFile, getGithubConfig } from "@/lib/cms/github";
import { listUploadedImages, resolveUploadPath } from "@/lib/cms/media";
import { canManageUsers } from "@/lib/cms/roles";

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  try {
    const files = await listUploadedImages();
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: "Medienverzeichnis nicht lesbar." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  if (!canManageUsers(session)) return NextResponse.json({ error: "Keine Berechtigung zum Löschen von Dateien." }, { status: 403 });

  let filename: string;
  try {
    const body = await request.json();
    filename = String(body.filename ?? "");
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const absPath = resolveUploadPath(filename);
  if (!absPath) {
    return NextResponse.json({ error: "Ungültiger Dateiname." }, { status: 400 });
  }

  try {
    await fs.unlink(absPath);
  } catch {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }

  if (!getGithubConfig()) {
    return NextResponse.json({
      committedToGithub: false,
      warning: "GitHub-Anbindung fehlt – Datei wurde nur lokal gelöscht.",
    });
  }

  try {
    await githubDeleteFile(`public/uploads/${filename}`, `cms: Bild "${filename}" löschen`, session.username);
  } catch {
    return NextResponse.json({
      committedToGithub: false,
      warning: "Lokal gelöscht, aber GitHub-Commit fehlgeschlagen.",
    });
  }

  return NextResponse.json({ committedToGithub: true });
}
