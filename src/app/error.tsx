"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-24 text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-[120px]"
        aria-hidden
      />
      <p className="relative text-sm font-semibold uppercase tracking-[0.3em] text-red-400">Fehler</p>
      <h1 className="relative mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Etwas ist schiefgelaufen
      </h1>
      <p className="relative mt-2 max-w-md text-sm text-muted">
        Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut oder kehre zur Startseite zurück.
      </p>
      <div className="relative mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-105"
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
