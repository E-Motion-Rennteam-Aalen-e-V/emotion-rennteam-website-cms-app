import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/cms/auth";
import { hashPassword } from "@/lib/cms/password";
import { listUsers, upsertUser } from "@/lib/cms/users";
import { canAssignRoles, canManageUsers, isAssignableRole, isSuperadmin, ROLE_ADMIN } from "@/lib/cms/roles";
import {
  isRemoteAuthEnabled,
  getCredentialsClient,
  createAdmin,
  CredentialsError,
  WeakPasswordError,
} from "@/lib/cms/credentialsRepo";

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Nur Administratoren können Benutzer verwalten." }, { status: 403 });
  }

  if (isRemoteAuthEnabled()) {
    try {
      const file = await getCredentialsClient().loadAdmins({ forceRefresh: true });
      const users = file.users.map((u) => ({
        username: u.username,
        roles: u.roles,
        disabled: u.disabled,
        mustChangePassword: u.mustChangePassword,
        lockedUntil: u.lockedUntil,
      }));
      return NextResponse.json({ admin: process.env.CMS_ADMIN_USER ?? null, remote: true, users });
    } catch (err) {
      console.error("Online-Benutzerverwaltung: Laden fehlgeschlagen:", err);
      return NextResponse.json(
        { error: "Online-Benutzerverwaltung ist momentan nicht erreichbar. Bitte später erneut versuchen." },
        { status: 502 }
      );
    }
  }

  const users = listUsers().map(({ username, mustChangePassword }) => ({
    username,
    mustChangePassword,
    roles: [] as string[],
    disabled: false,
    lockedUntil: null as string | null,
  }));
  return NextResponse.json({ admin: process.env.CMS_ADMIN_USER ?? null, remote: false, users });
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Nur Administratoren können Benutzer verwalten." }, { status: 403 });
  }

  let body: { username?: string; temporaryPassword?: string; roles?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const username = body.username?.trim();
  const temporaryPassword = body.temporaryPassword ?? "";

  if (!username) {
    return NextResponse.json({ error: "Bitte einen Benutzernamen angeben." }, { status: 400 });
  }
  if (username === process.env.CMS_ADMIN_USER) {
    return NextResponse.json({ error: "Dieser Benutzername ist bereits der Hauptadministrator." }, { status: 400 });
  }
  if (temporaryPassword.length < 8) {
    return NextResponse.json({ error: "Das temporäre Passwort muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  if (isRemoteAuthEnabled()) {
    const requestedRoles = Array.isArray(body.roles) ? body.roles.filter(isAssignableRole) : [];
    const rolesToAssign = requestedRoles.length > 0 ? requestedRoles : isSuperadmin(session) ? [ROLE_ADMIN] : [];
    if (rolesToAssign.length === 0) {
      return NextResponse.json({ error: "Bitte mindestens eine Rolle auswählen." }, { status: 400 });
    }
    if (!canAssignRoles(session, rolesToAssign)) {
      return NextResponse.json(
        { error: "Nur Superadmins dürfen Administrator- oder Superadmin-Zugänge anlegen." },
        { status: 403 }
      );
    }
    try {
      await createAdmin(getCredentialsClient(), {
        username,
        password: temporaryPassword,
        roles: rolesToAssign,
        actor: session.username,
        mustChangePassword: true,
      });
    } catch (err) {
      if (err instanceof WeakPasswordError || err instanceof CredentialsError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("Online-Benutzerverwaltung: Anlegen fehlgeschlagen:", err);
      return NextResponse.json(
        { error: "Benutzer konnte nicht online gespeichert werden. Bitte später erneut versuchen." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, username, mustChangePassword: true });
  }

  upsertUser(username, hashPassword(temporaryPassword));
  return NextResponse.json({ ok: true, username, mustChangePassword: true });
}
