/**
 * Side-profile silhouette of an open-wheel Formula Student car (long nose,
 * halo, endplated rear wing, exposed wheels) — not a generic road car —
 * used as the brand mark for loading states.
 */
function CarSilhouette() {
  return (
    <svg
      viewBox="0 0 240 90"
      className="h-14 w-auto sm:h-16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rear wing: struts + top plane + endplates, tucked over the rear wheel */}
      <path
        d="M180 40 L180 20 L206 20 L206 40M177 16 L177 25 M209 16 L209 25"
        stroke="url(#carGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Front wing: main plane + winglet, projecting ahead of the nose */}
      <path
        d="M2 53 L34 53M8 46 L30 46"
        stroke="url(#carGradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Halo / roll hoop, arcing clear above the flat cockpit line */}
      <path
        d="M85 40c2-16 24-16 26 0"
        stroke="url(#carGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Chassis: low flat nose -> rises over front wheel -> flat cockpit sill -> engine cover -> tail */}
      <path
        d="M6 52 L34 50c14-1 24-3 32-6 7-3 13-4 22-4h20c8 0 14-2 22-4 10-2 22-2 34 1 10 2 18 4 26 7l10 3"
        stroke="url(#carGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Front wheel */}
      <circle cx="46" cy="66" r="14" stroke="url(#carGradient)" strokeWidth="3" />
      <circle cx="46" cy="66" r="4" fill="currentColor" className="text-accent-text" />

      {/* Rear wheel */}
      <circle cx="188" cy="66" r="14" stroke="url(#carGradient)" strokeWidth="3" />
      <circle cx="188" cy="66" r="4" fill="currentColor" className="text-accent-text" />

      <defs>
        <linearGradient id="carGradient" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function FormulaCarLoader({ label = "Lädt" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-6 py-20"
    >
      <div className="relative h-20 w-full max-w-md overflow-hidden">
        {/* Track surface */}
        <div className="absolute bottom-4 left-0 right-0 h-px bg-border" />
        <div className="absolute bottom-4 left-0 right-0 flex justify-between opacity-40">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="h-px w-3 bg-muted" />
          ))}
        </div>

        <div className="absolute bottom-4 text-foreground animate-drive-across">
          <div className="animate-wheel-bounce">
            <CarSilhouette />
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold uppercase tracking-widest text-muted">{label}</p>
      <span className="sr-only">Inhalt wird geladen…</span>
    </div>
  );
}
