"use client";

import { useEffect, useState } from "react";

type UpdateStatus = "unknown" | "checking" | "up-to-date" | "installing-dependencies" | "updated";

interface StatusResponse {
  status: UpdateStatus;
  appliedAt?: string;
}

const POLL_MS = 20_000;
const SEEN_UPDATE_KEY = "cms-last-seen-update";

// Zeigt der Redaktion einen Hinweis, waehrend scripts/cms-supervisor.mjs im
// Hintergrund ein gefundenes Update herunterlaedt. Der laufende Server wird
// dabei bewusst NICHT live neu gestartet (das wuerde mitten in der Arbeit die
// Sitzung unterbrechen) - der neue Code wird erst beim naechsten Start des
// CMS aktiv. Ohne laufenden Supervisor (Status "unknown") wird nichts
// angezeigt.
export default function UpdateBanner() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  // Der Supervisor prueft absichtlich nicht schon beim Server-Start auf
  // Updates - das wuerde den Start verzoegern, bevor ueberhaupt jemand da
  // ist. Stattdessen stoesst genau dieser Aufruf hier den ersten (und
  // danach periodischen) Hintergrund-Check erst an, sobald tatsaechlich
  // jemand eingeloggt im Panel ankommt.
  useEffect(() => {
    fetch("/api/admin/trigger-update-check", { method: "POST" }).catch(() => {
      // Kein laufender Supervisor oder Netzwerkproblem - dann bleibt es
      // einfach beim manuellen/spaeteren Start, kein Fehlerfall.
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch("/api/admin/update-status", { cache: "no-store" });
        if (res.ok) {
          const data: StatusResponse = await res.json();
          if (!cancelled) setStatus(data);
        }
      } catch {
        // Netzwerkproblem - einfach beim naechsten Poll weiter versuchen.
      } finally {
        if (!cancelled) timer = setTimeout(poll, POLL_MS);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!status) return null;

  if (status.status === "installing-dependencies") {
    return (
      <div className="border-b border-accent/30 bg-accent/10 px-4 py-2.5 text-center text-sm text-accent-text sm:px-6">
        Ein Update wird im Hintergrund vorbereitet…
      </div>
    );
  }

  if (status.status === "updated" && status.appliedAt) {
    const alreadySeen = typeof window !== "undefined" && localStorage.getItem(SEEN_UPDATE_KEY) === status.appliedAt;
    if (alreadySeen) return null;
    try {
      localStorage.setItem(SEEN_UPDATE_KEY, status.appliedAt);
    } catch {
      // localStorage ggf. nicht verfuegbar - Hinweis wird dann bei jedem
      // Laden kurz erneut angezeigt, kein Problem.
    }
    return (
      <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center text-sm text-emerald-400 sm:px-6">
        Ein Update wurde heruntergeladen und wird automatisch aktiv, sobald das CMS das nächste Mal gestartet wird.
      </div>
    );
  }

  return null;
}
