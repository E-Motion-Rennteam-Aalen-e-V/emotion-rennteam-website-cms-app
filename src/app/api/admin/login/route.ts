import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/cms/auth";
import { burnPasswordVerificationTime, verifyPassword } from "@/lib/cms/password";
import { findUser } from "@/lib/cms/users";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import {
  isRemoteAuthEnabled,
  getCredentialsClient,
  login as remoteLogin,
  AccountLockedError,
  AccountDisabledError,
  InvalidCredentialsError,
} from "@/lib/cms/credentialsRepo";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`cms-login:${ip}`, 5, 5 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Zu viele Anmeldeversuche. Bitte in ein paar Minuten erneut versuchen." },
      { status: 429 }
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const { username, password } = body;
  const adminUser = process.env.CMS_ADMIN_USER;
  const adminHash = process.env.CMS_ADMIN_PASSWORD_HASH;

  if (
    (!adminUser || !adminHash) &&
    typeof username === "string" &&
    !findUser(username) &&
    !isRemoteAuthEnabled()
  ) {
    return NextResponse.json(
      {
        error:
          "CMS-Login ist serverseitig nicht konfiguriert (CMS_ADMIN_USER/CMS_ADMIN_PASSWORD_HASH oder die Online-Benutzerverwaltung fehlen).",
      },
      { status: 503 }
    );
  }

  const sessionSecret = process.env.CMS_SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 16) {
    return NextResponse.json(
      { error: "CMS-Login ist serverseitig nicht konfiguriert (CMS_SESSION_SECRET fehlt oder ist zu kurz)." },
      { status: 503 }
    );
  }

  let mustChangePassword = false;
  let roles: string[] = [];
  let authenticated = false;

  if (typeof username === "string" && typeof password === "string") {
    if (adminUser && adminHash && username === adminUser && verifyPassword(password, adminHash)) {
      authenticated = true;
    } else {
      const localUser = findUser(username);
      if (localUser && verifyPassword(password, localUser.passwordHash)) {
        authenticated = true;
        mustChangePassword = localUser.mustChangePassword;
      } else if (!localUser && isRemoteAuthEnabled()) {
        try {
          const admin = await remoteLogin(getCredentialsClient(), username, password);
          authenticated = true;
          mustChangePassword = admin.mustChangePassword;
          roles = admin.roles;
        } catch (err) {
          if (err instanceof AccountLockedError) {
            return NextResponse.json({ error: err.message }, { status: 423 });
          }
          if (err instanceof AccountDisabledError) {
            return NextResponse.json({ error: err.message }, { status: 403 });
          }
          if (!(err instanceof InvalidCredentialsError)) {
            console.error("Online-Benutzerverwaltung: Login fehlgeschlagen:", err);
            return NextResponse.json(
              { error: "Online-Benutzerverwaltung ist momentan nicht erreichbar. Bitte später erneut versuchen." },
              { status: 502 }
            );
          }
          // InvalidCredentialsError: unten auf die generische 401-Antwort durchfallen.
        }
      } else if (!localUser) {
        // Kein lokaler Nutzer und keine Online-Benutzerverwaltung konfiguriert
        // (oder Nutzername dort auch unbekannt, s.o.): trotzdem den gleichen
        // Rechenaufwand wie eine echte Passwortpruefung verbrennen, damit die
        // Antwortzeit keine gueltigen Benutzernamen verraet.
        burnPasswordVerificationTime(password);
      }
    }
  }

  if (!authenticated) {
    return NextResponse.json({ error: "Benutzername oder Passwort ist falsch." }, { status: 401 });
  }

  const token = await createSessionToken(username as string, mustChangePassword, roles);
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
