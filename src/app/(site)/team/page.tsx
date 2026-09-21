import type { Metadata } from "next";
import { getPage, getTeam, TEAM_DEPARTMENTS } from "@/lib/content";
import Reveal from "@/components/motion/Reveal";
import TeamByGeneration from "@/components/team/TeamByGeneration";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Das Team hinter dem E-Motion Rennteam Aalen: Studierende aus allen Fachbereichen, die gemeinsam einen Formula-Student-Electric-Rennwagen entwickeln.",
  alternates: { canonical: "/team" },
};

const DEPARTMENT_IMAGES: Record<string, string> = {
  "Project Management": "/uploads/Team%20wdp/Vorstand.jpg",
  "Chassis and Ergonomics": "/uploads/Team%20wdp/CCBOM.jpg",
  Powertrain: "/uploads/Team%20wdp/Powertrain.jpg",
  Aerodynamics: "/uploads/Team%20wdp/Aero.jpg",
  "Suspension and Steering Systems": "/uploads/Team%20wdp/Wheelpackage.jpg",
  Driverless: "/uploads/Team%20wdp/Driverless.jpg",
  "Vehicle Dynamics": "/uploads/Team%20wdp/Vehicle%20Dynamics.jpg",
  "Media and Marketing": "/uploads/Team%20wdp/Media.jpg",
};

const TEAM_DESCRIPTIONS: Record<string, string> = {
  "Project Management":
    "Koordiniert das Gesamtprojekt, die Wettbewerbsplanung und die Zusammenarbeit aller Fachteams.",
  Workshop:
    "Betreibt und organisiert die Werkstatt – Maschinen, Material und Fertigungsprozesse für den Fahrzeugbau.",
  "Chassis and Ergonomics":
    "Verantwortlich für Monocoque, Karosserie und die ergonomische Integration des Fahrers ins Fahrzeug.",
  Electrics:
    "Entwickelt Batteriesystem, Leistungselektronik und sorgt für die Hochvolt-Sicherheit des Fahrzeugs.",
  Powertrain:
    "Konzipiert und baut Motoren, Getriebe und den Antriebsstrang des Fahrzeugs.",
  Aerodynamics:
    "Optimiert Abtrieb und Luftwiderstand mit CFD-Simulationen und dem Design der Flügelelemente.",
  "Suspension and Steering Systems":
    "Zuständig für Radaufhängung, Lenkung, Dämpfung und die Fahrdynamik-Abstimmung auf der Strecke.",
  Driverless:
    "Baut die Fahrzeugsoftware, Sensorik und das autonome Fahrmodul für die Driverless-Disziplin.",
  "Vehicle Dynamics":
    "Simuliert und optimiert das Fahrverhalten und die Gesamtabstimmung des Fahrzeugs.",
  "Testing and Data Acquisition":
    "Verantwortlich für Telemetrie, Sensorik und die Auswertung aller Test- und Rennfahrtdaten.",
  "Media and Marketing":
    "Kümmert sich um Öffentlichkeitsarbeit, Social Media und den Außenauftritt des Teams.",
  "Business Plan":
    "Entwickelt das Geschäftskonzept und die strategische Ausrichtung des Teams für den Business-Plan-Wettbewerb.",
  Sponsoring:
    "Betreut bestehende Sponsoren und akquiriert neue Partnerschaften für das Team.",
  Eventmanagement:
    "Plant und organisiert Team-Events, Rollout und die Teilnahme an Wettbewerben.",
  Finance:
    "Verantwortlich für Budgetplanung, Controlling und die finanzielle Steuerung des Teams.",
};

export default function TeamPage() {
  const team = getTeam();
  const page = getPage("team");

  const descriptions: Record<string, string> = { ...TEAM_DESCRIPTIONS };
  if (page?.departmentDescriptions?.length) {
    for (const d of page.departmentDescriptions) {
      descriptions[d.label] = d.value;
    }
  }

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Team</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl">
          {page?.heroTitle ?? "Die Köpfe hinter dem ERT-14/26"}
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          {page?.heroSubtitle ??
            `Über 50 Studierende verschiedenster Fachrichtungen entwickeln, fertigen und testen gemeinsam unseren elektrischen Rennwagen – organisiert in ${TEAM_DEPARTMENTS.length} Fachteams.`}
        </p>
      </Reveal>

      <TeamByGeneration
        team={team}
        departments={TEAM_DEPARTMENTS}
        departmentImages={DEPARTMENT_IMAGES}
        descriptions={descriptions}
      />
    </div>
  );
}
