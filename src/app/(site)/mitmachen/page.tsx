import type { Metadata } from "next";
import { getPage, getPositions, TEAM_DEPARTMENTS } from "@/lib/content";
import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import MemberApplicationForm from "@/components/MemberApplicationForm";
import AlumniShowcase from "@/components/AlumniShowcase";

export const metadata: Metadata = {
  title: "Mitmachen",
  description:
    "Werde Teil des E-Motion Rennteams Aalen: offene Positionen in allen Fachbereichen für Studierende der Hochschule Aalen.",
  alternates: { canonical: "/mitmachen" },
};

export default function JoinPage() {
  const positions = getPositions();
  const page = getPage("join");
  const stats = [
    { value: "Seit 2009", label: "Am Start" },
    { value: "50", label: "Aktive Mitglieder" },
    { value: String(TEAM_DEPARTMENTS.length), label: "Fachbereiche" },
  ];

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Mitmachen</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl">
          {page?.heroTitle ?? "Werde Teil des Teams"}
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          {page?.heroSubtitle ??
            "Egal ob Chassis, Electrics, Driverless oder Sponsoring – bei uns lernst du, Theorie in ein reales Projekt zu übersetzen. Keine Vorerfahrung nötig, nur Motivation."}
        </p>
      </Reveal>

      <Reveal delay={0.03} className="mt-10 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface">
        {stats.map((stat) => (
          <div key={stat.label} className="px-3 py-5 text-center sm:px-6">
            <p className="text-2xl font-extrabold tracking-tight text-accent-text sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted sm:text-sm">{stat.label}</p>
          </div>
        ))}
      </Reveal>

      <Reveal delay={0.05} className="mt-14">
        <h2 className="border-b border-border pb-3 text-xl font-bold">Offene Positionen</h2>
      </Reveal>

      <StaggerGroup className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {positions.map((position) => (
          <StaggerItem key={position.slug}>
            <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent/50">
              <div className="flex flex-wrap items-center gap-2">
                {position.department && (
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-text">
                    {position.department}
                  </span>
                )}
                {position.commitment && (
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
                    {position.commitment}
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{position.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{position.body}</p>
              <a
                href="#bewerbung"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-text transition-all hover:gap-2 hover:underline"
              >
                Jetzt bewerben <span aria-hidden>&rarr;</span>
              </a>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <Reveal delay={0.08} className="mt-6 text-center text-sm text-muted">
        Dein Fachbereich ist nicht dabei? Wir suchen in allen Bereichen – von Workshop über
        Powertrain bis Business Plan – laufend Verstärkung.{" "}
        <a href="#bewerbung" className="font-semibold text-accent-text hover:underline">
          Schreib uns einfach eine Initiativbewerbung.
        </a>
      </Reveal>

      <AlumniShowcase />

      <Reveal id="bewerbung" delay={0.1} className="mt-20 scroll-mt-24 rounded-2xl border border-accent/40 bg-surface p-8 sm:p-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Bewirb dich jetzt</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Egal ob für eine offene Position oder als Initiativbewerbung – wir freuen uns auf
            deine Nachricht.
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-2xl">
          <MemberApplicationForm />
        </div>
      </Reveal>
    </div>
  );
}
