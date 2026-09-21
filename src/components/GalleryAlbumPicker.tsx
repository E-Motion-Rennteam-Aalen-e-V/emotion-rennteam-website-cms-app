"use client";

import { useState } from "react";
import GalleryGrid from "@/components/GalleryGrid";

type GalleryImage = {
  slug: string;
  title: string;
  image: string;
  album: string;
};

export default function GalleryAlbumPicker({
  albums,
}: {
  albums: { name: string; images: GalleryImage[] }[];
}) {
  const [selected, setSelected] = useState(albums[0]?.name ?? "");
  const active = albums.find((album) => album.name === selected) ?? albums[0];

  return (
    <div>
      <label htmlFor="album-select" className="text-sm font-medium">
        Album auswählen
      </label>
      <select
        id="album-select"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mt-2 w-full max-w-sm rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent sm:w-auto"
      >
        {albums.map((album) => (
          <option key={album.name} value={album.name}>
            {album.name} ({album.images.length})
          </option>
        ))}
      </select>

      {active && <GalleryGrid images={active.images} />}
    </div>
  );
}
