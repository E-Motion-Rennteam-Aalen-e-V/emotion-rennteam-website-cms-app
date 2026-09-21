"use client";

import { useState } from "react";

export default function ShutdownButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleShutdown() {
    if (
      !confirm(
        "CMS-Server wirklich beenden?\n\nDas Programm wird komplett geschlossen (nicht nur abgemeldet) und muss danach über CMS-Start neu gestartet werden. Alle Redakteure werden dabei getrennt."
      )
    ) {
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/admin/shutdown", { method: "POST" });
      if (!res.ok) {
        setState("error");
        return;
      }
      setState("done");
      // Best effort: Browser lassen App-Fenster (chrome/edge --app=…) nur in
      // manchen Fällen per Skript schließen. Klappt es nicht, bleibt der
      // Hinweistext stehen und die Person schließt das Fenster selbst.
      setTimeout(() => window.close(), 400);
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
        Server beendet. Fenster kann geschlossen werden.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleShutdown}
        disabled={state === "loading"}
        title="Beendet den lokalen CMS-Server komplett (nicht nur Abmelden)"
        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60"
      >
        {state === "loading" ? "Beendet…" : "Herunterfahren"}
      </button>
      {state === "error" && <span className="text-xs text-red-400">Fehlgeschlagen.</span>}
    </div>
  );
}
