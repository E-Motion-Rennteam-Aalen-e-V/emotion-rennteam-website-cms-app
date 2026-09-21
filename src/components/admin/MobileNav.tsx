"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";

interface Props {
  isAdmin: boolean;
  visibleCollectionNames: readonly string[];
}

export default function MobileNav({ isAdmin, visibleCollectionNames }: Props) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Navigationsmenü öffnen"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              key="drawer"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-border bg-surface px-4 py-6 md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Navigation</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Menü schließen"
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <Sidebar isAdmin={isAdmin} visibleCollectionNames={visibleCollectionNames} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
