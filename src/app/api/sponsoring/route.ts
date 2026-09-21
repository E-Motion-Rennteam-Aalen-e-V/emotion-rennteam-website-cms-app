import { NextRequest, NextResponse } from "next/server";
import { validateSponsorForm } from "@/lib/validation";
import { hasDeliverableDomain, isMxCheckEnabled } from "@/lib/emailDeliverability";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { deliverFormSubmission } from "@/lib/formDelivery";
import { hasJsonContentType, isTrustedOrigin } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  }
  if (!hasJsonContentType(request)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 415 });
  }

  const ip = getClientIp(request);
  if (!(await checkRateLimit(`sponsoring:${ip}`, 5, 10 * 60 * 1000))) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte versuche es später erneut." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (isTurnstileEnabled()) {
    const rawToken = (body as Record<string, unknown> | null)?.["cf-turnstile-response"];
    const token = typeof rawToken === "string" ? rawToken : "";
    if (!(await verifyTurnstileToken(token, ip))) {
      return NextResponse.json(
        { ok: false, error: "Sicherheitsprüfung fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut." },
        { status: 403 }
      );
    }
  }

  const result = validateSponsorForm(body);
  if (!result.valid) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  if (isMxCheckEnabled() && !(await hasDeliverableDomain(result.data.email))) {
    return NextResponse.json(
      { ok: false, errors: { email: "Diese E-Mail-Adresse scheint nicht erreichbar zu sein (keine Mail-Server gefunden)." } },
      { status: 400 }
    );
  }

  if (!(await checkRateLimit(`email:${result.data.email.toLowerCase()}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte versuche es später erneut." },
      { status: 429 }
    );
  }

  if (!result.isBot) {
    await deliverFormSubmission("sponsoring", result.data);
  }

  return NextResponse.json({ ok: true });
}
