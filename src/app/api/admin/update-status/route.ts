import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSessionUser } from "@/lib/cms/auth";

// Wird von scripts/cms-supervisor.mjs waehrend des Betriebs laufend
// aktualisiert (periodische Update-Pruefung im Hintergrund). Existiert die
// Datei nicht, laeuft der Server ohne den Supervisor (z.B. per "npm run dev"
// direkt gestartet) - dann gibt es einfach keinen automatischen Update-Check.
const STATUS_FILE = path.join(process.cwd(), ".cms-update-status.json");

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  try {
    const raw = await fs.readFile(STATUS_FILE, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ status: "unknown" });
  }
}
