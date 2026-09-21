import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import Reveal from "@/components/motion/Reveal";
import MediaKitRequestForm from "@/components/MediaKitRequestForm";

export const metadata: Metadata = {
  title: "Mediakit",
  description:
    "Bild- und Videomaterial vom E-Motion Rennteam Aalen anfragen: Team-, Fahrzeug- und Renneinsatzfotos sowie Logos für Presse und Sponsoren.",
  alternates: { canonical: "/mediakit" },
};

export default function MediaKitPage() {
  const page = getPage("mediakit");

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Mediakit</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl">
          {page?.heroTitle ?? "Bild- und Videomaterial anfragen"}
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          {page?.heroSubtitle ??
            "Für Präsentationen, Pressemitteilungen oder eure eigene Website: Sagt uns, welches Material ihr braucht – wir stellen es passend zusammen."}
        </p>
      </Reveal>

      <Reveal delay={0.05} className="mt-14 max-w-2xl">
        <MediaKitRequestForm />
      </Reveal>
    </div>
  );
}
