import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

type AlumniStory = {
  name: string;
  outcome: string;
  detail: string;
};

const ALUMNI: AlumniStory[] = [
  {
    name: "Jonas",
    outcome: "Yachtbau",
    detail: "Entwickelt heute eigene Yachten",
  },
  {
    name: "Leon",
    outcome: "Audi",
    detail: "Direkt in die Automobilentwicklung gestartet",
  },
  {
    name: "Leon S.",
    outcome: "BMW Motorsport",
    detail: "Vom Boxenstopp im Team zum Werksmotorsport",
  },
  {
    name: "Steffen",
    outcome: "Fahrzeugerprobung",
    detail: "Heute Testfahrer für Fahrzeugerprobung",
  },
];

export default function AlumniShowcase() {
  return (
    <Reveal
      delay={0.05}
      className="mt-20 overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 via-surface to-surface p-8 sm:p-10"
    >
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">
          Dein Sprungbrett
        </p>
        <h2 className="mx-auto mt-2 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Formula Student ist der direkte Weg in die Industrie
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Unsere Alumni entwickeln heute Serienfahrzeuge, testen Prototypen oder bauen eigene
          Boote – das Team ist der Ort, an dem ihre Karriere angefangen hat. Mehrere Ehemalige
          arbeiten inzwischen bei Porsche.
        </p>
      </div>

      <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ALUMNI.map((alum) => (
          <StaggerItem key={alum.name}>
            <div className="flex h-full flex-col rounded-xl border border-border/60 bg-background/60 p-5 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-lg font-bold text-accent-text">
                {alum.name.charAt(0)}
              </span>
              <p className="mt-3 font-semibold">{alum.name}</p>
              <p className="mt-1 text-sm font-semibold text-accent-text">{alum.outcome}</p>
              <p className="mt-2 text-xs text-muted">{alum.detail}</p>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="mt-8 text-center">
        <a
          href="#bewerbung"
          className="inline-flex items-center gap-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:gap-2"
        >
          Schreib deine eigene Erfolgsgeschichte <span aria-hidden>&rarr;</span>
        </a>
      </div>
    </Reveal>
  );
}
