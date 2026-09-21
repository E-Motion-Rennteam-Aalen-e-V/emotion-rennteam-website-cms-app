"use client";

import { useEffect, useRef, useState } from "react";
import type { CollectionDef, FieldDef } from "@/lib/cms/collections";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RichTextField from "@/components/admin/RichTextField";

interface SaveResult {
  slug: string;
  committedToGithub: boolean;
  commitUrl: string | null;
  warning?: string;
}

interface DeleteResult {
  committedToGithub: boolean;
  commitUrl: string | null;
  warning?: string;
}

interface Props {
  collectionName: string;
  collection: CollectionDef;
  mode: "create" | "edit";
  initialSlug?: string;
  initialData?: Record<string, unknown>;
  initialBody?: string;
  onSaved: (result: SaveResult) => void;
  onDeleted?: (result: DeleteResult) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type FieldValue = string | number | boolean | Record<string, string>[] | undefined;

/** Sub-field schema an objectList field falls back to when it defines none. */
const DEFAULT_OBJECT_LIST_FIELDS: FieldDef[] = [
  { name: "label", label: "Bezeichnung", type: "string" },
  { name: "value", label: "Wert", type: "string" },
];

// Every collection has at most one `richText` field, and — regardless of the
// `isBody` flag, which is only used for `isBody: true` at the schema level —
// existing content always stores that field's value as the markdown body,
// not as frontmatter. So the richText field is always the body field.
function fieldsWithoutBody(collection: CollectionDef): FieldDef[] {
  return collection.fields.filter((f) => f.type !== "richText");
}

function bodyField(collection: CollectionDef): FieldDef | undefined {
  return collection.fields.find((f) => f.type === "richText");
}

// Existing content stores full ISO timestamps (e.g. "2025-08-10T09:00:00.000Z");
// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in the browser's local
// time. Converting through Date preserves the time-of-day on edit instead of
// silently truncating it to midnight, which a plain <input type="date"> would.
function toDatetimeLocalValue(value: FieldValue): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ContentForm({
  collectionName,
  collection,
  mode,
  initialSlug,
  initialData,
  initialBody,
  onSaved,
  onDeleted,
  onDirtyChange,
}: Props) {
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [data, setData] = useState<Record<string, FieldValue>>(() => (initialData as Record<string, FieldValue>) ?? {});
  const [body, setBody] = useState(initialBody ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  // The `saving` state disables the submit button, but that disabling only
  // takes effect on React's next render — two clicks dispatched in the same
  // event-loop tick (a fast real double-click, or any script that fires two
  // click events back to back) both run handleSubmit before that render
  // happens, which used to fire two POST requests and create two entries.
  // A plain ref is set synchronously, so the second call sees it immediately.
  const submittingRef = useRef(false);

  const bField = bodyField(collection);
  const titleFieldName = collection.fields.find((f) => f.isTitle)?.name;
  const imageFieldName = fieldsWithoutBody(collection).find((f) => f.type === "image")?.name;
  const [autoMatchedPhoto, setAutoMatchedPhoto] = useState<string | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameValue = titleFieldName ? data[titleFieldName] : undefined;

  // "Name = Bild": when the title field (e.g. "Name") is filled in and the
  // image field is still empty, look for an already-uploaded photo whose
  // filename matches — most team photos already live under
  // public/uploads/single-bilder-upload/<Name>.jpg, so editors shouldn't
  // have to re-upload something that's already there. Never overwrites an
  // image the editor picked themselves.
  useEffect(() => {
    if (!titleFieldName || !imageFieldName) return;
    if (typeof nameValue !== "string" || !nameValue.trim()) return;
    if (data[imageFieldName]) return;
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/media/lookup?name=${encodeURIComponent(nameValue)}`);
        if (!res.ok) return;
        const result = await res.json();
        if (result.path && !data[imageFieldName]) {
          setField(imageFieldName, result.path);
          setAutoMatchedPhoto(result.path);
        }
      } catch {
        // No match found or lookup failed — editor can still upload manually.
      }
    }, 500);
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameValue, titleFieldName, imageFieldName]);

  // Lets the parent (EditorPanel via CollectionExplorer) confirm before
  // discarding an editor's in-progress work when they close the panel
  // without saving — compares against a snapshot taken once on mount, not
  // on every initial* prop change, so it stays stable across re-renders.
  const initialSnapshot = useRef(JSON.stringify({ slug: initialSlug ?? "", data: initialData ?? {}, body: initialBody ?? "" }));
  useEffect(() => {
    const dirty = JSON.stringify({ slug, data, body }) !== initialSnapshot.current;
    onDirtyChange?.(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, data, body]);

  function setField(name: string, value: FieldValue) {
    setData((prev) => ({ ...prev, [name]: value }));
    // Also reported synchronously here, not just from the effect below: that
    // effect only runs after the next commit, which is one or two render
    // cycles behind a change dispatched programmatically (or by a very fast
    // typist) immediately followed by Escape/backdrop-click - close enough
    // together that the parent's dirty flag hadn't been raised yet, so the
    // unsaved-changes confirmation was silently skipped.
    onDirtyChange?.(true);
  }

  function findMissingRequiredImageField(): FieldDef | undefined {
    // Native HTML `required` validation only covers <input>/<select>/
    // <textarea>; the image field is a custom upload widget with no such
    // element when empty, so the browser would happily submit it blank.
    return fieldsWithoutBody(collection).find((f) => f.type === "image" && f.required && !data[f.name]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;
    const missingImage = findMissingRequiredImageField();
    if (missingImage) {
      setResult({ ok: false, message: `${missingImage.label} ist erforderlich – bitte ein Bild hochladen.` });
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setResult(null);
    try {
      const payload = { slug, data, body: bField ? body : undefined };
      const url = mode === "create" ? `/api/admin/content/${collectionName}` : `/api/admin/content/${collectionName}/${initialSlug}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseData = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: responseData.error || "Speichern fehlgeschlagen." });
        return;
      }
      setResult({
        ok: true,
        message: responseData.committedToGithub
          ? "Gespeichert und als Commit auf GitHub gesichert."
          : responseData.warning || "Gespeichert.",
      });
      onSaved({
        slug: mode === "create" ? responseData.slug : (initialSlug ?? slug),
        committedToGithub: responseData.committedToGithub,
        commitUrl: responseData.commitUrl ?? null,
        warning: responseData.warning,
      });
    } catch {
      setResult({ ok: false, message: "Verbindung zum Server fehlgeschlagen." });
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialSlug) return;
    if (!confirm(`Diesen Eintrag wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/content/${collectionName}/${initialSlug}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Löschen fehlgeschlagen." });
        return;
      }
      onDeleted?.(data);
    } catch {
      setResult({ ok: false, message: "Verbindung zum Server fehlgeschlagen." });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === "create" && (
        <div>
          <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-foreground">
            URL-Slug <span className="text-muted">(optional, wird sonst automatisch erzeugt)</span>
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              onDirtyChange?.(true);
            }}
            className="w-full max-w-sm rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
            placeholder="mein-eintrag"
          />
        </div>
      )}

      {fieldsWithoutBody(collection).map((field) => (
        <FieldEditor
          key={field.name}
          field={field}
          value={data[field.name]}
          onChange={(v) => {
            if (field.name === imageFieldName) setAutoMatchedPhoto(null);
            setField(field.name, v);
          }}
          autoMatchedNote={
            field.name === imageFieldName && autoMatchedPhoto === data[field.name]
              ? `Automatisch zugeordnet: ${autoMatchedPhoto?.split("/").pop()}`
              : undefined
          }
        />
      ))}

      {bField && (
        <div>
          <label htmlFor="body" className="mb-1.5 block text-sm font-medium text-foreground">
            {bField.label}
          </label>
          <RichTextField
            id="body"
            value={body}
            onChange={(v) => {
              setBody(v);
              onDirtyChange?.(true);
            }}
            rows={12}
          />
        </div>
      )}

      {result && (
        <p
          role="status"
          className={`rounded-lg border px-3.5 py-2.5 text-sm ${
            result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {result.message}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={saving || deleting}
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {saving ? "Speichert…" : "Speichern"}
        </button>
        {mode === "edit" && onDeleted && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="rounded-lg border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Löscht…" : "Löschen"}
          </button>
        )}
      </div>
    </form>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  autoMatchedNote,
}: {
  field: FieldDef;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  autoMatchedNote?: string;
}) {
  switch (field.type) {
    case "string":
      return (
        <TextField field={field}>
          <input
            id={field.name}
            type="text"
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </TextField>
      );
    case "text":
      return (
        <TextField field={field}>
          <textarea
            id={field.name}
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </TextField>
      );
    case "number":
      return (
        <TextField field={field}>
          <input
            id={field.name}
            type="number"
            required={field.required}
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
            className="w-full max-w-[10rem] rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </TextField>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          {field.label}
        </label>
      );
    case "datetime":
      return (
        <TextField field={field}>
          <input
            id={field.name}
            type="datetime-local"
            required={field.required}
            value={toDatetimeLocalValue(value)}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
            className="w-full max-w-[16rem] rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
        </TextField>
      );
    case "select":
      return (
        <TextField field={field}>
          <select
            id={field.name}
            required={field.required}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="">Bitte wählen…</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </TextField>
      );
    case "image":
      return (
        <TextField field={field}>
          <ImageUploadField value={(value as string) ?? ""} onChange={(v) => onChange(v)} />
          {autoMatchedNote && <p className="mt-1.5 text-xs text-emerald-400">{autoMatchedNote}</p>}
        </TextField>
      );
    case "objectList":
      return <ObjectListField field={field} value={(value as Record<string, string>[]) ?? []} onChange={onChange} />;
    default:
      return null;
  }
}

function TextField({ field, children }: { field: FieldDef; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-red-400"> *</span>}
      </label>
      {children}
    </div>
  );
}

function ObjectListField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: Record<string, string>[];
  onChange: (v: Record<string, string>[]) => void;
}) {
  // Reads the row schema from the collection definition instead of
  // hardcoding "label"/"value" column names, so an objectList field with a
  // differently-named sub-schema (see collections.ts FieldDef.fields)
  // actually renders and edits its own columns instead of silently doing
  // nothing with them.
  const columns = field.fields && field.fields.length > 0 ? field.fields : DEFAULT_OBJECT_LIST_FIELDS;

  function emptyRow(): Record<string, string> {
    return Object.fromEntries(columns.map((col) => [col.name, ""]));
  }

  function updateRow(index: number, key: string, val: string) {
    const next = value.map((row, i) => (i === index ? { ...row, [key]: val } : row));
    onChange(next);
  }

  function moveRow(index: number, direction: -1 | 1) {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-foreground">{field.label}</p>
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Reorder controls */}
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => moveRow(i, -1)}
                disabled={i === 0}
                aria-label="Zeile nach oben"
                className="rounded px-1 py-0.5 text-[10px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveRow(i, 1)}
                disabled={i === value.length - 1}
                aria-label="Zeile nach unten"
                className="rounded px-1 py-0.5 text-[10px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            {columns.map((col, colIndex) => (
              <input
                key={col.name}
                type="text"
                value={row[col.name] ?? ""}
                onChange={(e) => updateRow(i, col.name, e.target.value)}
                placeholder={col.label}
                className={`${colIndex === 0 ? "w-1/3" : "flex-1"} rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent`}
              />
            ))}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="rounded-md px-2.5 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...value, emptyRow()])}
        className="mt-2 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
      >
        + Zeile hinzufügen
      </button>
    </div>
  );
}
