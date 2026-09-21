import { readdir, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

/**
 * Downscales/recompresses CMS-uploaded photos in public/uploads that are far
 * larger than any layout on the site ever displays them at (camera-original
 * JPEGs running 3000-4500px wide, shown in 300-2000px slots). Next/image
 * still resizes on request, but decoding a 15+ megapixel source on every
 * cache miss costs real time and the oversized originals bloat the repo for
 * no visual benefit. Run this after adding new photos to public/uploads.
 *
 * Usage: node scripts/optimize-uploads.mjs
 */

const TARGETS = [
  // Team department banners: rendered up to ~2000px wide (2x @ 1024px CSS).
  { dir: "public/uploads/Team wdp", maxDimension: 2000, quality: 82 },
  // Individual member portraits: rendered at 300x300 (2x retina = 600px).
  { dir: "public/uploads/single-bilder-upload", maxDimension: 900, quality: 82 },
];

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

async function optimizeFile(path, maxDimension, quality) {
  const image = sharp(path);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) return null;

  const longestEdge = Math.max(metadata.width, metadata.height);
  if (longestEdge <= maxDimension) return null;

  const before = (await stat(path)).size;
  const resized = image.resize({
    width: metadata.width >= metadata.height ? maxDimension : undefined,
    height: metadata.height > metadata.width ? maxDimension : undefined,
    withoutEnlargement: true,
  });

  const buffer =
    extname(path).toLowerCase() === ".png"
      ? await resized.png({ quality, compressionLevel: 9 }).toBuffer()
      : await resized.jpeg({ quality, mozjpeg: true }).toBuffer();

  await writeFile(path, buffer);
  const after = buffer.length;
  return { before, after };
}

async function run() {
  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;

  for (const { dir, maxDimension, quality } of TARGETS) {
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      console.warn(`Skipping missing directory: ${dir}`);
      continue;
    }

    for (const entry of entries) {
      if (!IMAGE_EXTENSIONS.has(extname(entry).toLowerCase())) continue;
      const path = join(dir, entry);
      const result = await optimizeFile(path, maxDimension, quality);
      if (!result) continue;

      changed += 1;
      totalBefore += result.before;
      totalAfter += result.after;
      console.log(
        `${path}: ${(result.before / 1024).toFixed(0)}KB -> ${(result.after / 1024).toFixed(0)}KB`
      );
    }
  }

  console.log(
    `\nOptimized ${changed} file(s): ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(
      totalAfter /
      1024 /
      1024
    ).toFixed(1)}MB`
  );
}

run();
