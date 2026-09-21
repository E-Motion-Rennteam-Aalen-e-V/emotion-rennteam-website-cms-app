"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface MediaFile {
  name: string;
  path: string;
  size: number;
  mtime: number;
}

// Turns "1725984123-timo-mueller.jpg" into "Timo Mueller" so the picker
// shows a name instead of a raw, timestamp-prefixed filename — the whole
// point of the picker is matching a face to a name at a glance.
function guessName(filename: string): string {
  const stem = filename.replace(/\.[^/.]+$/, "").replace(/^\d+-/, "");
  return stem
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function LibraryPickerModal({ onSelect, onClose }: { onSelect: (path: string) => void; onClose: () => void }) {
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/media");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Mediathek konnte nicht geladen werden.");
          return;
        }
        setFiles(data.files);
      } catch {
        if (!cancelled) setError("Verbindung zum Server fehlgeschlagen.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (files ?? []).filter((f) =>
    search.trim() ? f.name.toLowerCase().includes(search.trim().toLowerCase()) : true
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">Aus Mediathek wählen</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            Schließen
          </button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nach Namen suchen…"
          aria-label="Mediathek durchsuchen"
          className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <div className="overflow-y-auto">
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {!error && files === null && <p className="text-sm text-muted">Lädt…</p>}
          {!error && files !== null && filtered.length === 0 && (
            <p className="text-sm text-muted">Keine Bilder gefunden.</p>
          )}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {filtered.map((file) => (
              <button
                key={file.name}
                type="button"
                onClick={() => onSelect(file.path)}
                className="group overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-accent"
              >
                <div className="aspect-square overflow-hidden bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.path}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="truncate px-1.5 py-1 text-[11px] font-medium text-foreground" title={file.name}>
                  {guessName(file.name.split("/").pop() ?? file.name)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Kept separate so a hard failure (nothing uploaded, red) never looks the
  // same as a soft warning (upload succeeded, e.g. "not committed to
  // GitHub", amber) — they used to share one field and one color.
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    setWarning("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload fehlgeschlagen.");
        return;
      }
      onChange(data.publicPath);
      if (data.warning) setWarning(data.warning);
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {/* Direkter Upload läuft über den Server und landet erst per GitHub-Commit
          im Repo (siehe saveUploadedImage) — dabei kommt es bei manchen
          Dateien (z. B. iPhone-HEIC, sehr große Originale) öfter zu
          Konvertierungs-/Commit-Fehlern. Bei Problemen: Bild direkt im
          GitHub-Repo unter public/uploads/ hochladen und hier nur den
          Pfad eintragen bzw. aus der Mediathek auswählen. */}
      <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
        Bei Upload-Fehlern: Bild lieber direkt im GitHub-Repo unter{" "}
        <code className="font-mono">public/uploads/</code> hochladen und danach hier aus der
        Mediathek wählen.
      </p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
          {value ? (
            <Image src={value} alt="" width={80} height={80} className="h-full w-full object-cover" unoptimized />
          ) : (
            <span className="text-[10px] text-muted">Kein Bild</span>
          )}
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent disabled:opacity-60"
            >
              {uploading ? "Lädt hoch…" : "Bild hochladen"}
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent"
            >
              Aus Mediathek wählen
            </button>
          </div>
          {value && (
            <input
              type="text"
              aria-label="Bildpfad"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted outline-none focus:border-accent"
            />
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
      {warning && <p className="mt-2 text-xs text-amber-400">{warning}</p>}
      {pickerOpen && (
        <LibraryPickerModal
          onSelect={(path) => {
            onChange(path);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
