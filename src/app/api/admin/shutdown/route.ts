import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/cms/auth";

function requireAdmin(username: string): boolean {
  return Boolean(process.env.CMS_ADMIN_USER) && username === process.env.CMS_ADMIN_USER;
}

// Ends the locally running CMS process cleanly. When started via
// scripts/cms-start.{sh,bat,command} → cms-supervisor.mjs, this process is
// the supervisor's child ("npm run dev"); the supervisor treats an
// unplanned child exit as "stop" (see child.on("exit") in
// cms-supervisor.mjs), so this single process.exit() cascades into a full,
// clean shutdown of both the server and its supervisor. Run without the
// supervisor (e.g. a plain "npm run dev"), it just stops that process.
export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!requireAdmin(session.username)) {
    return NextResponse.json({ error: "Nur der Hauptadministrator kann das CMS beenden." }, { status: 403 });
  }

  // Delay the exit past this handler's return so the response actually
  // reaches the browser before the process (and, in dev, its request
  // pipeline) goes away.
  setTimeout(() => process.exit(0), 300);
  return NextResponse.json({ ok: true });
}
