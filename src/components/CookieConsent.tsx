"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const COOKIE_NAME = "cookie-consent";
const COOKIE_MAX_AGE_DAYS = 180;

function readConsentCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
}

const listeners = new Set<() => void>();

/**
 * document.cookie has no change event, so there is nothing to subscribe to -
 * writeConsentCookie() below notifies listeners itself right after writing.
 */
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return readConsentCookie();
}

/**
 * No cookies exist during SSR. Reporting "answered" here (rather than
 * undefined) keeps the banner out of the server-rendered markup so it never
 * flashes in and immediately back out for returning visitors between the
 * server response and hydration reading the real cookie value.
 */
function getServerSnapshot() {
  return "server-render" as const;
}

function writeConsentCookie(value: "accepted" | "declined") {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
  for (const callback of listeners) callback();
}

export default function CookieConsent() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Das CMS-Admin-Panel ist kein öffentlicher Seitenbereich und setzt keine
  // Tracking-/Marketing-Cookies - der Hinweis ist dort fehl am Platz und
  // überlagert (fixed, volle Breite, unten) sonst die Speichern-Buttons der
  // Editier-Panels, sodass Redakteur:innen nicht speichern können, bevor sie
  // ihn weggeklickt haben.
  if (pathname?.startsWith("/admin")) return null;
  const visible = consent === undefined;

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-surface/95 backdrop-blur-sm"
    >
      <div className="container-page flex flex-col items-center gap-4 py-5 text-sm text-muted sm:flex-row sm:justify-between">
        <p className="max-w-2xl">
          Wir setzen ausschließlich ein technisch notwendiges Cookie, um deine Auswahl zu diesem
          Hinweis zu speichern. Tracking- oder Marketing-Cookies verwenden wir nicht. Mehr dazu in
          unserer{" "}
          <Link href="/datenschutz" className="text-accent-text underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => writeConsentCookie("declined")}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-accent/60"
          >
            Ablehnen
          </button>
          <button
            type="button"
            onClick={() => writeConsentCookie("accepted")}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}
