import { type NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { getSessionUser } from "@/lib/cms/auth";
import { listUploadedImages } from "@/lib/cms/media";

// Strips accents/diacritics and anything but letters/digits so "Timo M."
// and "timo-m" both normalize to "timom" for comparison against filenames.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type Candidate = { path: string; stem: string; mtime: number };

async function collectImages(): Promise<Candidate[]> {
  const files = await listUploadedImages();
  return files.map((file) => ({
    path: file.path,
    stem: normalize(path.basename(file.name, path.extname(file.name))),
    mtime: file.mtime,
  }));
}

// Looks up an already-uploaded image (anywhere under public/uploads/, any
// depth) whose filename matches a typed name, so editors don't have to
// manually re-upload a photo that's already there under e.g.
// "single-bilder-upload/<Name>.jpg". Matches the full name first, falling
// back to just the first word (most existing files are named by first name
// only); picks the newest file on a tie.
export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const name = request.nextUrl.searchParams.get("name")?.trim() ?? "";
  if (!name) return NextResponse.json({ path: null });

  const images = await collectImages();

  const fullNorm = normalize(name);
  const firstWordNorm = normalize(name.split(/\s+/)[0] ?? "");

  const pick = (stem: string) => {
    const candidates = images.filter((img) => img.stem === stem);
    if (!candidates.length) return null;
    return candidates.reduce((a, b) => (b.mtime > a.mtime ? b : a));
  };

  const match = pick(fullNorm) ?? (firstWordNorm && firstWordNorm !== fullNorm ? pick(firstWordNorm) : null);
  return NextResponse.json({ path: match?.path ?? null });
}
