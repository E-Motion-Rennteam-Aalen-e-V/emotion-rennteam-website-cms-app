"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionDef } from "@/lib/cms/collections";
import ContentForm from "@/components/admin/ContentForm";
import EditorPanel from "@/components/admin/EditorPanel";

interface Item {
  slug: string;
  data: Record<string, unknown>;
  body: string;
}

interface WriteResult {
  committedToGithub: boolean;
  warning?: string;
}

type PanelState =
  | { mode: "create" }
  | { mode: "create-from"; sourceSlug: string }
  | { mode: "edit"; slug: string }
  | null;

// Maps a collection name + optional slug to the public URL where the content
// appears on the live site. Returns null when there's no direct preview URL.
function publicPreviewUrl(collectionName: string, slug: string): string | null {
  switch (collectionName) {
    case "news":
      return `/news/${slug}`;
    case "blog":
      return `/blog/${slug}`;
    case "team":
      return "/team";
    case "vehicle":
      return "/fahrzeuge";
    case "sponsor":
      return "/sponsoren";
    case "galleryImage":
      return "/galerie";
    case "result":
      return "/erfolge";
    case "position":
      return "/mitmachen";
    case "navItem":
      return null;
    case "page":
      // Map page slugs to their routes
      if (slug === "home") return "/";
      if (slug === "team") return "/team";
      if (slug === "sponsors") return "/sponsoren";
      if (slug === "join") return "/mitmachen";
      if (slug === "contact") return "/kontakt";
      if (slug === "formula-student") return "/formula-student";
      if (slug === "datenschutz") return "/datenschutz";
      if (slug === "impressum") return "/impressum";
      return null;
    default:
      return null;
  }
}

// The panel closes as soon as a save/delete succeeds (see closePanel() in
// onSaved/onDeleted below), which unmounts ContentForm's own success/warning
// message in the same tick it appears — a real editor could never actually
// read it, most importantly the warning that a change was only saved
// locally and NOT committed to GitHub. Recording it here, outside the
// panel, keeps it on screen after the panel is gone.
function noticeForWriteResult(result: WriteResult, verb: "gespeichert" | "gelöscht"): { kind: "ok" | "warning"; message: string } {
  if (result.committedToGithub) {
    return { kind: "ok", message: `Erfolgreich ${verb} und als Commit auf GitHub gesichert.` };
  }
  return { kind: "warning", message: result.warning || `Erfolgreich ${verb}.` };
}

export default function CollectionExplorer({
  collectionName,
  collection,
  initialItems,
}: {
  collectionName: string;
  collection: CollectionDef;
  initialItems: Item[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"slug" | "title" | "date">("slug");
  const [panel, setPanel] = useState<PanelState>(null);
  const [panelDirty, setPanelDirty] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "warning"; message: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(n: { kind: "ok" | "warning"; message: string }) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(n);
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }

  const titleField = collection.fields.find((f) => f.isTitle);

  // The in-panel confirm() below only covers navigation this component can
  // intercept (Escape, the × button, a backdrop click). It can't run for a
  // browser back button, tab close, or manual refresh — those unmount the
  // page before any JS handler gets a chance to ask, silently discarding
  // whatever the editor typed. beforeunload is the one hook the platform
  // gives us for that case; only registered while there's something to lose.
  useEffect(() => {
    if (!panelDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [panelDirty]);

  // Re-fetches the list after a save/create/delete inside the panel so it
  // reflects the change without a full page reload. Never called from an
  // effect (only from these user-triggered callbacks), so there's no
  // synchronous-setState-in-effect concern here.
  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/content/${collectionName}`);
      const responseData = await res.json();
      if (!res.ok) {
        setLoadError(responseData.error || "Laden fehlgeschlagen.");
        return;
      }
      setItems(responseData.items);
      setLoadError("");
    } catch {
      setLoadError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setRefreshing(false);
    }
  }

  const hasDates = collection.fields.some((f) => f.type === "datetime");

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? items.filter((item) => {
          const title = titleField ? String(item.data[titleField.name] ?? "") : "";
          return title.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query);
        })
      : [...items];

    filtered.sort((a, b) => {
      if (sortBy === "title") {
        const ta = titleField ? String(a.data[titleField.name] ?? a.slug) : a.slug;
        const tb = titleField ? String(b.data[titleField.name] ?? b.slug) : b.slug;
        return ta.localeCompare(tb, "de");
      }
      if (sortBy === "date") {
        const dateField = collection.fields.find((f) => f.type === "datetime");
        const da = dateField ? new Date(String(a.data[dateField.name] ?? "")).getTime() : 0;
        const db = dateField ? new Date(String(b.data[dateField.name] ?? "")).getTime() : 0;
        return db - da;
      }
      return a.slug.localeCompare(b.slug);
    });
    return filtered;
  }, [items, search, sortBy, titleField, collection.fields]);

  function itemTitle(item: Item): string {
    return titleField ? String(item.data[titleField.name] ?? item.slug) : item.slug;
  }

  function closePanel() {
    setPanel(null);
    setPanelDirty(false);
  }

  // Used for every user-initiated close (backdrop click, Escape, the × button)
  // so an editor can't lose in-progress work with one stray click. Saves and
  // deletes call closePanel() directly since the change is already persisted.
  function requestClosePanel() {
    if (panelDirty && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
    closePanel();
  }

  function openDuplicate(item: Item) {
    setNotice(null);
    setPanel({ mode: "create-from", sourceSlug: item.slug });
  }

  // Resolve the item to show in the panel when duplicating or editing.
  function resolveEditItem(): Item | undefined {
    if (!panel) return undefined;
    if (panel.mode === "edit") return items.find((i) => i.slug === panel.slug);
    if (panel.mode === "create-from") return items.find((i) => i.slug === panel.sourceSlug);
    return undefined;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{collection.label}</h1>
          <p className="text-sm text-muted">{refreshing ? "Aktualisiert…" : `${items.length} Einträge`}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setPanel({ mode: "create" });
          }}
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-105"
        >
          + Neuer Eintrag
        </button>
      </div>

      {collectionName === "page" && (
        <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-300">
          ⚠️ Hier werden feste Seiteninhalte (Hero-Texte, Kennzahlen, Abteilungsbeschreibungen) direkt bearbeitet.
          Unerfahrene Mitarbeiter bitte aufpassen: Änderungen wirken sich sofort auf die entsprechende Seite aus.
        </p>
      )}

      {notice && (
        <p
          role="status"
          className={`mb-4 rounded-lg border px-3.5 py-2.5 text-sm ${
            notice.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}
        >
          {notice.message}
        </p>
      )}

      {items.length >= 6 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Einträge durchsuchen…"
            aria-label="Einträge durchsuchen"
            className="w-full max-w-sm rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-xs">
            <span className="px-1.5 text-muted">Sortieren:</span>
            {(["slug", "title", ...(hasDates ? (["date"] as const) : [])] as Array<"slug" | "title" | "date">).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  sortBy === key ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {key === "slug" ? "Slug" : key === "title" ? "Titel" : "Datum ↓"}
              </button>
            ))}
          </div>
        </div>
      )}

      {loadError && (
        <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          {loadError}
        </p>
      )}

      {!refreshing && filteredItems.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {items.length === 0 ? "Noch keine Einträge vorhanden." : "Keine Einträge gefunden."}
        </p>
      )}

      <div className="space-y-2">
        {filteredItems.map((item) => {
          const previewUrl = publicPreviewUrl(collectionName, item.slug);
          return (
            <div
              key={item.slug}
              className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent"
            >
              {/* Main edit button — takes up remaining space */}
              <button
                type="button"
                onClick={() => {
                  setNotice(null);
                  setPanel({ mode: "edit", slug: item.slug });
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block break-words font-medium text-foreground">{itemTitle(item)}</span>
                <span className="block break-words text-xs text-muted">{item.slug}</span>
              </button>

              {/* Action buttons */}
              <div className="flex shrink-0 items-center gap-1.5">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
                    title="Auf der Website ansehen"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Vorschau
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => openDuplicate(item)}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
                  title="Eintrag duplizieren"
                >
                  Duplizieren
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null);
                    setPanel({ mode: "edit", slug: item.slug });
                  }}
                  className="text-xs text-accent-text"
                >
                  Bearbeiten →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {panel && (
        <EditorPanel
          title={
            panel.mode === "create"
              ? `Neuer Eintrag: ${collection.label}`
              : panel.mode === "create-from"
                ? `Duplizieren: ${collection.label}`
                : `${collection.label} bearbeiten`
          }
          onClose={requestClosePanel}
        >
          {panel.mode === "create" ? (
            <ContentForm
              collectionName={collectionName}
              collection={collection}
              mode="create"
              onDirtyChange={setPanelDirty}
              onSaved={(result) => {
                setNotice(noticeForWriteResult(result, "gespeichert"));
                closePanel();
                refresh();
              }}
            />
          ) : panel.mode === "create-from" ? (
            (() => {
              const source = resolveEditItem();
              if (!source) return <p className="text-sm text-muted">Quelleintrag nicht gefunden.</p>;
              return (
                <ContentForm
                  collectionName={collectionName}
                  collection={collection}
                  mode="create"
                  initialData={source.data}
                  initialBody={source.body}
                  onDirtyChange={setPanelDirty}
                  onSaved={(result) => {
                    showNotice(noticeForWriteResult(result, "gespeichert"));
                    closePanel();
                    refresh();
                  }}
                />
              );
            })()
          ) : (
            (() => {
              const item = items.find((i) => i.slug === panel.slug);
              if (!item) return <p className="text-sm text-muted">Eintrag nicht gefunden.</p>;
              const previewUrl = publicPreviewUrl(collectionName, item.slug);
              return (
                <>
                  {previewUrl && (
                    <div className="mb-4">
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
                      >
                        Auf der Website ansehen →
                      </a>
                    </div>
                  )}
                  <ContentForm
                    collectionName={collectionName}
                    collection={collection}
                    mode="edit"
                    initialSlug={item.slug}
                    initialData={item.data}
                    initialBody={item.body}
                    onDirtyChange={setPanelDirty}
                    onSaved={(result) => {
                      showNotice(noticeForWriteResult(result, "gespeichert"));
                      closePanel();
                      refresh();
                    }}
                    onDeleted={(result) => {
                      showNotice(noticeForWriteResult(result, "gelöscht"));
                      closePanel();
                      refresh();
                    }}
                  />
                </>
              );
            })()
          )}
        </EditorPanel>
      )}
    </div>
  );
}
