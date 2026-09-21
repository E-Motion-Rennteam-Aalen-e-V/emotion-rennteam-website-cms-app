import type { Metadata } from "next";
import Image from "next/image";
import { getVehicles, getPage } from "@/lib/content";
import Reveal from "@/components/motion/Reveal";
import TerminalSpecs from "@/components/TerminalSpecs";

export const metadata: Metadata = {
  title: "Fahrzeuge",
  description:
    "Die Rennwagen des E-Motion Rennteams Aalen: technische Daten, Baujahre und Entwicklung unserer Formula-Student-Electric-Boliden.",
  alternates: { canonical: "/fahrzeuge" },
};

export default function VehiclesPage() {
  const vehicles = getVehicles();
  const page = getPage("vehicles");

  return (
    <div className="container-page py-20">
      <Reveal className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Fahrzeuge</p>
        <h1 className="mx-auto mt-2 max-w-2xl text-5xl font-extrabold tracking-tight sm:text-6xl">
          {page?.heroTitle ?? "Unsere Boliden"}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          {page?.heroSubtitle ??
            "Jedes Jahr entwickeln wir ein neues, vollelektrisches Formula-Student-Fahrzeug – von der Simulation bis zur Rennstrecke."}
        </p>
      </Reveal>

      <div className="relative mt-20">
        <div className="absolute left-4 top-0 h-full w-px bg-border sm:left-1/2" />

        <div className="space-y-16 sm:space-y-24">
          {vehicles.map((vehicle, i) => (
            <Reveal
              key={vehicle.slug}
              direction={i % 2 === 0 ? "left" : "right"}
              className={`relative flex flex-col gap-4 sm:flex-row sm:items-center ${
                i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
              }`}
            >
              <span className="absolute left-4 top-6 flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center sm:left-1/2">
                {vehicle.current && (
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`relative h-3 w-3 rounded-full border-2 ${
                    vehicle.current ? "border-accent bg-accent" : "border-border bg-background"
                  }`}
                />
              </span>

              <div
                className={`w-full pl-10 sm:w-1/2 sm:pl-0 ${
                  i % 2 === 0 ? "sm:pr-12" : "sm:pl-12"
                }`}
              >
                <div className="overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent/50">
                  {vehicle.coverImage && (
                    <div className="relative aspect-[16/9] w-full">
                      <Image
                        src={vehicle.coverImage}
                        alt={vehicle.name}
                        fill
                        sizes="(min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-accent-text">
                        {vehicle.year}
                      </span>
                      {vehicle.current && (
                        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                          Aktuell
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {vehicle.name}
                    </h2>
                    {vehicle.tagline && <p className="mt-2 text-muted">{vehicle.tagline}</p>}
                    {vehicle.body && <p className="mt-4 text-sm text-muted">{vehicle.body}</p>}

                    {vehicle.specs && vehicle.specs.length > 0 && (
                      <TerminalSpecs specs={vehicle.specs} achievements={vehicle.achievements} />
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
