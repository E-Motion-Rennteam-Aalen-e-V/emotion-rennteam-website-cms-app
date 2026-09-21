import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, getSessionUser } from "@/lib/cms/auth";
import { hashPassword } from "@/lib/cms/password";
import { setUserPassword, findUser } from "@/lib/cms/users";
import {
  isRemoteAuthEnabled,
  getCredentialsClient,
  changePassword as remoteChangePassword,
  WeakPasswordError,
  CredentialsError,
} from "@/lib/cms/credentialsRepo";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isBreakGlassAdmin } from "@/lib/cms/roles";

export async function POST(request: NextRequest) {
  const sessionSecret = process.env.CMS_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 16) {
    return NextResponse.json(
      { error: "CMS-Login ist serverseitig nicht konfiguriert (CMS_SESSION_SECRET fehlt oder ist zu kurz)." },
      { status: 500 }
    );
  }

  // Rate-Limit: max. 10 Passwortaenderungsversuche pro IP in 5 Minuten.
  // Verhindert Brute-Force-Angriffe auf das neue Passwort, auch wenn der
  // Angreifer bereits eine gueltige Sitzung besitzt.
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`cms-change-password:${ip}`, 10, 5 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte in ein paar Minuten erneut versuchen." },
      { status: 429 }
    );
  }

  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: { newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { newPassword } = body;
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  // Break-glass admin authenticates via CMS_ADMIN_PASSWORD_HASH env var;
  // the password can only be changed by updating that env var directly.
  if (isBreakGlassAdmin(session)) {
    return NextResponse.json(
      { error: "Das Passwort des Notfall-Admins kann nur über die Umgebungsvariable CMS_ADMIN_PASSWORD_HASH geändert werden." },
      { status: 400 }
    );
  }

  const isLocalUser = Boolean(findUser(session.username));

  if (isLocalUser) {
    const updated = setUserPassword(session.username, hashPassword(newPassword));
    if (!updated) {
      return NextResponse.json(
        { error: "Für diesen Benutzer kann das Passwort hier nicht geändert werden." },
        { status: 400 }
      );
    }
  } else if (isRemoteAuthEnabled() && session.roles.length > 0) {
    try {
      await remoteChangePassword(getCredentialsClient(), {
        targetUsername: session.username,
        newPassword,
        actor: session.username,
      });
    } catch (err) {
      if (err instanceof WeakPasswordError || err instanceof CredentialsError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("Online-Benutzerverwaltung: Passwortänderung fehlgeschlagen:", err);
      return NextResponse.json(
        { error: "Online-Benutzerverwaltung ist momentan nicht erreichbar. Bitte später erneut versuchen." },
        { status: 502 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Für diesen Benutzer kann das Passwort hier nicht geändert werden." },
      { status: 400 }
    );
  }

  const token = await createSessionToken(session.username, false, session.roles);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
