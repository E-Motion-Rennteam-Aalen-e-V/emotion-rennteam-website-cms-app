import Link from "next/link";

export default function NotFoundContent() {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--foreground) 0px, var(--foreground) 1px, transparent 1px, transparent 64px)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[50vh] w-[50vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px]"
        aria-hidden
      />
      <p className="relative bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl">
        404
      </p>
      <h1 className="relative mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Diese Seite gibt es nicht (mehr)
      </h1>
      <p className="relative mt-2 max-w-md text-sm text-muted">
        Vielleicht wurde die Seite verschoben oder der Link ist veraltet. Schau doch auf der Startseite vorbei.
      </p>
      <Link
        href="/"
        className="relative mt-8 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-105"
      >
        Zur Startseite
      </Link>
    </div>
  );
}
