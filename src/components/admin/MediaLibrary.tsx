"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface MediaFile {
  name: string;
  path: string;
  size: number;
  mtime: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaLibrary({ initialFiles }: { initialFiles: MediaFile[] }) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [notice, setNotice] = useState<{ kind: "ok" | "warning" | "error"; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      if (res.ok) setFiles(data.files);
    } catch {
      // silent
    }
  }, []);

  // Clear the "Kopiert" indicator automatically
  useEffect(() => {
    if (!copiedPath) return;
    const id = setTimeout(() => setCopiedPath(null), 2000);
    return () => clearTimeout(id);
  }, [copiedPath]);

  async function uploadFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      setNotice({ kind: "error", message: `"${file.name}" ist zu groß (max. 15 MB).` });
      return;
    }
    setUploading(true);
    setNotice(null);
    let res: Response | undefined;
    try {
      const form = new FormData();
      form.append("file", file);
      res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Upload fehlgeschlagen." });
        return;
      }
      setNotice({
        kind: data.committedToGithub ? "ok" : "warning",
        message: data.committedToGithub
          ? `Hochgeladen und auf GitHub gesichert: ${data.publicPath}`
          : data.warning || `Hochgeladen: ${data.publicPath}`,
      });
      await refresh();
    } catch {
      // `res` having a value here means the server answered but with a body
      // that wasn't valid JSON (e.g. a crashed/HTML error page) - worth
      // surfacing the status code instead of implying the network itself
      // is down, which is what actually happens when `res` is still
      // undefined (fetch() itself threw).
      setNotice({
        kind: "error",
        message: res
          ? `Server-Antwort ungültig (Status ${res.status}). Bitte Server-Konsole prüfen.`
          : "Verbindung fehlgeschlagen. Bitte Internetverbindung und Server-Status prüfen.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    await Promise.all(files.map((file) => uploadFile(file)));
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Datei "${filename}" wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    setDeleting(filename);
    setNotice(null);
    let res: Response | undefined;
    try {
      res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ kind: "error", message: data.error || "Löschen fehlgeschlagen." });
        return;
      }
      setNotice({
        kind: data.committedToGithub ? "ok" : "warning",
        message: data.committedToGithub
          ? `"${filename}" gelöscht und Commit auf GitHub gespeichert.`
          : data.warning || `"${filename}" lokal gelöscht.`,
      });
      setFiles((prev) => prev.filter((f) => f.name !== filename));
    } catch {
      setNotice({
        kind: "error",
        message: res
          ? `Server-Antwort ungültig (Status ${res.status}). Bitte Server-Konsole prüfen.`
          : "Verbindung fehlgeschlagen. Bitte Internetverbindung und Server-Status prüfen.",
      });
    } finally {
      setDeleting(null);
    }
  }

  async function copyPath(filePath: string) {
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedPath(filePath);
    } catch {
      // Fallback: put path into a prompt so the user can copy it manually
      window.prompt("Pfad kopieren:", filePath);
    }
  }

  const filtered = search.trim()
    ? files.filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : files;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-accent px-16 py-12 text-center">
            <p className="text-2xl font-bold text-accent-text">Bild hier ablegen</p>
            <p className="mt-1 text-sm text-muted">JPG, PNG, WebP oder GIF</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Medienbibliothek</h1>
          <p className="text-sm text-muted">{files.length} Datei{files.length !== 1 ? "en" : ""} gesamt</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            id="media-upload"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label
            htmlFor="media-upload"
            className={`cursor-pointer rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-105 ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            {uploading ? "Lädt hoch…" : "+ Bild hochladen"}
          </label>
        </div>
      </div>

      {/* Drop zone hint when library is empty */}
      {files.length === 0 && !dragOver && (
        <div className="mb-4 rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted transition-colors hover:border-accent">
          <p className="font-medium text-foreground">Bilder hier ablegen oder oben hochladen</p>
          <p className="mt-1">JPG, PNG, WebP und GIF werden unterstützt</p>
        </div>
      )}

      {notice && (
        <>
          <p
            role="status"
            className={`mb-2 rounded-lg border px-3.5 py-2.5 text-sm ${
              notice.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : notice.kind === "warning"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {notice.message}
          </p>
          {notice.kind === "error" && (
            <p className="mb-4 text-xs text-muted">
              Tipp: Bild direkt im GitHub-Repo unter <code className="font-mono">public/uploads/</code> hochladen.
            </p>
          )}
        </>
      )}

      {files.length >= 6 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Dateien durchsuchen…"
          aria-label="Dateien durchsuchen"
          className="mb-4 w-full max-w-sm rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
      )}

      {filtered.length === 0 && files.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          Keine Dateien gefunden.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((file) => (
          <div
            key={file.name}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent"
          >
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.path}
              alt={file.name}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />

            {/* Overlay with actions */}
            <div className="flex flex-col gap-1 p-2">
              <p className="truncate text-xs font-medium text-foreground" title={file.name}>
                {file.name.split("/").pop()}
              </p>
              <p className="text-[10px] text-muted">{formatBytes(file.size)}</p>
              <div className="mt-1 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => copyPath(file.path)}
                  className="flex-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:border-accent hover:text-accent-text"
                  title="Pfad in die Zwischenablage kopieren"
                >
                  {copiedPath === file.path ? "✓ Kopiert" : "Pfad kopieren"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(file.name)}
                  disabled={deleting === file.name}
                  className="rounded-md border border-red-500/20 px-2 py-1 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                  title="Datei löschen"
                >
                  {deleting === file.name ? "…" : "Löschen"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
