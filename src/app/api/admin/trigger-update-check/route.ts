import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSessionUser } from "@/lib/cms/auth";

// Wird einmalig von UpdateBanner.tsx aufgerufen, sobald sich jemand
// eingeloggt hat und im Admin-Panel ankommt. Legt nur eine leere Markerdatei
// an, die scripts/cms-supervisor.mjs im Hintergrund abpollt (siehe dort) -
// dieser Next.js-Prozess kann den Update-Vorgang nicht selbst ausfuehren,
// da der Supervisor als getrennter Elternprozess den Server-Neustart
// steuert.
const TRIGGER_FILE = path.join(process.cwd(), ".cms-update-trigger");

export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  try {
    await fs.writeFile(TRIGGER_FILE, new Date().toISOString());
  } catch {
    // Ohne laufenden Supervisor (z.B. "npm run dev" direkt) passiert einfach
    // nichts - kein automatischer Update-Check, aber auch kein Fehlerfall.
  }
  return NextResponse.json({ ok: true });
}
