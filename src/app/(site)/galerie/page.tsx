import type { Metadata } from "next";
import Link from "next/link";
import { getGallery, getPage } from "@/lib/content";
import Reveal from "@/components/motion/Reveal";
import GalleryAlbumPicker from "@/components/GalleryAlbumPicker";

export const metadata: Metadata = {
  title: "Galerie",
  description:
    "Bildergalerie des E-Motion Rennteams Aalen: Impressionen von Fahrzeugbau, Testfahrten, Events und Wettbewerben, nach Album sortiert.",
  alternates: { canonical: "/galerie" },
};

function groupByAlbum(images: ReturnType<typeof getGallery>) {
  const albums = new Map<string, typeof images>();
  for (const image of images) {
    albums.set(image.album, [...(albums.get(image.album) ?? []), image]);
  }
  return Array.from(albums.entries()).map(([name, images]) => ({ name, images }));
}

export default function GalleryPage() {
  const albums = groupByAlbum(getGallery());
  const hasImages = albums.length > 0;
  const page = getPage("gallery");

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Galerie</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl">
          {page?.heroTitle ?? "Impressionen"}
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          {page?.heroSubtitle ??
            "Eindrücke von Wettbewerben, aus der Werkstatt und von Events – das E-Motion Rennteam Aalen in Bildern, nach Album sortiert."}
        </p>
      </Reveal>

      {hasImages ? (
        <Reveal delay={0.05} className="mt-14">
          <GalleryAlbumPicker albums={albums} />
        </Reveal>
      ) : (
        <p className="mt-14 text-muted">Es sind noch keine Bilder hinterlegt.</p>
      )}

      <Reveal delay={0.1} className="mt-20 rounded-2xl border border-accent/40 bg-surface p-8 text-center sm:p-10">
        <h2 className="text-2xl font-bold">Mediakit</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Sponsoren und Presse können unser Mediakit mit Logos, Fahrzeugbildern und Team-Fotos in
          hoher Auflösung direkt bei uns anfragen.
        </p>
        <Link
          href="/mediakit"
          className="mt-6 inline-flex items-center gap-1 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
        >
          Mediakit anfragen
        </Link>
      </Reveal>
    </div>
  );
}
