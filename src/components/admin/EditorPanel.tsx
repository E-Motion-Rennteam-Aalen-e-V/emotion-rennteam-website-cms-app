"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

// Keyboard-focusable, but skips things that are hidden or explicitly
// removed from the tab order (matches what a screen-reader/keyboard user
// could actually reach).
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function EditorPanel({ title, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Kept in sync on every render (not via an effect) so the keydown listener
  // below - subscribed once - always calls the *current* onClose. Without
  // this, closing over the initial onClose (or re-subscribing only when the
  // effect's dependency changes) could still call a close handler that
  // captured a stale "not dirty" state from just before an edit landed.
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
        onClick={onClose}
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
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-2xl flex-col border-l border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
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
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </motion.div>
    </AnimatePresence>
  );
}
