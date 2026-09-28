"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** When provided, a split-view toggle appears that shows this page in an iframe alongside the editor. */
  previewUrl?: string;
  /** Increment this to reload the preview iframe after a save. */
  previewSaveKey?: number;
}

// Keyboard-focusable, but skips things that are hidden or explicitly
// removed from the tab order (matches what a screen-reader/keyboard user
// could actually reach).
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function EditorPanel({ title, onClose, children, previewUrl, previewSaveKey = 0 }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [splitView, setSplitView] = useState(false);
  const [manualRefreshCount, setManualRefreshCount] = useState(0);
  const iframeKey = previewSaveKey * 1000 + manualRefreshCount;
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  // Moves focus into the panel on open and restores it to whatever
  // triggered the panel (e.g. the list-item or "Neuer Eintrag" button) once
  // it closes, so a keyboard user never loses their place on the page.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Trap Tab/Shift+Tab inside the panel so a keyboard user can't tab
      // through to the (visually obscured) page behind the backdrop.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      } else if (!panelRef.current.contains(current)) {
        // Focus somehow ended up outside the panel (e.g. programmatic
        // focus elsewhere) — pull it back in rather than letting Tab
        // continue from wherever it landed.
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // Subscribes once per mount; onCloseRef (kept current via the layout
    // effect above) is what keeps this listener from calling a stale onClose.
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm"
        onClick={splitView ? undefined : onClose}
        aria-hidden
      />
      <motion.div
        key="panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className={
          splitView
            ? "fixed inset-0 z-40 flex shadow-2xl"
            : "fixed inset-y-0 right-0 z-40 flex w-full max-w-2xl flex-col border-l border-border bg-surface shadow-2xl"
        }
      >
        {splitView ? (
          <>
            {/* Left: editor form */}
            <div className="flex w-[42%] flex-col border-r border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="truncate text-base font-bold tracking-tight text-foreground">{title}</h2>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSplitView(false)}
                    title="Vorschau schließen"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                  </button>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Schließen"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            </div>

            {/* Right: live preview iframe */}
            <div className="flex w-[58%] flex-col bg-zinc-950">
              <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-muted">Live-Vorschau</span>
                  {previewUrl && (
                    <span className="hidden truncate text-xs text-muted/60 sm:block">{previewUrl}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setManualRefreshCount((k) => k + 1)}
                    title="Vorschau aktualisieren"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="In neuem Tab öffnen"
                      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
              {previewUrl ? (
                <iframe
                  key={iframeKey}
                  src={previewUrl}
                  className="h-full w-full flex-1 border-0"
                  title="Live-Vorschau"
                />
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-muted">Keine Vorschau verfügbar.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => setSplitView(true)}
                    title="Vorschau-Ansicht aktivieren"
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                    </svg>
                    Vorschau
                  </button>
                )}
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Schließen"
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
