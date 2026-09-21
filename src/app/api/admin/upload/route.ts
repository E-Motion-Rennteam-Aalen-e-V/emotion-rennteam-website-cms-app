import { NextRequest, NextResponse } from "next/server";
import { saveUploadedImage } from "@/lib/cms/content";
import { getSessionUser } from "@/lib/cms/auth";
import { matchesImageSignature } from "@/lib/imageSignature";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
// SVG is deliberately excluded. It's an XML document format that can carry
// inline <script>: browsers won't execute it when it's only ever loaded via
// <img>/<Image> (as this admin UI does), but these files are written into
// public/uploads/ and served statically at the site's own origin — anyone
// who follows a link straight to /uploads/<file>.svg gets it rendered as a
// top-level document, where inline scripts *do* run, and this app's CSP
// (script-src 'self' 'unsafe-inline', needed for Next's own hydration
// bootstrap) does not block that. A malicious or compromised editor session
// could use that as a stored-XSS vector against ordinary site visitors, not
// just against the admin panel, so unlike the other allowed image types the
// risk isn't confined to admins. Re-enable only alongside real sanitization
// (e.g. stripping <script>/event handlers server-side) or by serving
// uploads with a forced Content-Disposition/different origin.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage (Formulardaten konnten nicht gelesen werden)." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Nur Bilddateien (JPG, PNG, WebP, GIF) sind erlaubt." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Datei ist zu groß (max. 8 MB)." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesImageSignature(bytes, file.type)) {
    return NextResponse.json(
      { error: "Datei-Inhalt passt nicht zum angegebenen Dateityp." },
      { status: 400 }
    );
  }

  try {
    const result = await saveUploadedImage(file.name, file.type, bytes, user.username);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload fehlgeschlagen." }, { status: 502 });
  }
}
