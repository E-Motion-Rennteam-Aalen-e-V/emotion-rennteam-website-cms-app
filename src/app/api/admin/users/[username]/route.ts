import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/cms/auth";
import { deleteUser } from "@/lib/cms/users";
import {
  canAssignRoles,
  canManageTarget,
  canManageUsers,
  isAssignableRole,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
} from "@/lib/cms/roles";
import {
  isRemoteAuthEnabled,
  getCredentialsClient,
  removeAdmin,
  setRoles,
  setDisabled,
  CredentialsError,
} from "@/lib/cms/credentialsRepo";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Nur Administratoren können Benutzer verwalten." }, { status: 403 });
  }

  const { username } = await params;
  const targetUsername = decodeURIComponent(username);

  if (targetUsername.toLowerCase() === session.username.toLowerCase()) {
    return NextResponse.json({ error: "Der eigene Zugang kann nicht entfernt werden." }, { status: 400 });
  }

  const removedLocally = deleteUser(targetUsername);
  if (removedLocally) return NextResponse.json({ ok: true });

  if (isRemoteAuthEnabled()) {
    try {
      const client = getCredentialsClient();
      const file = await client.loadAdmins();
      const target = file.users.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
      if (target && !canManageTarget(session, target.roles)) {
        return NextResponse.json(
          { error: "Nur Superadmins dürfen Administrator- oder Superadmin-Zugänge entfernen." },
          { status: 403 }
        );
      }
      await removeAdmin(client, { targetUsername, actor: session.username });
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof CredentialsError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("Online-Benutzerverwaltung: Entfernen fehlgeschlagen:", err);
      return NextResponse.json(
        { error: "Online-Benutzerverwaltung ist momentan nicht erreichbar. Bitte später erneut versuchen." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ error: "Benutzer wurde nicht gefunden." }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const session = await getSessionUser(request);
  if (!session) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Nur Administratoren können Benutzer verwalten." }, { status: 403 });
  }
  if (!isRemoteAuthEnabled()) {
    return NextResponse.json(
      { error: "Rollen/Sperren sind nur über die Online-Benutzerverwaltung möglich." },
      { status: 400 }
    );
  }

  const { username } = await params;
  const targetUsername = decodeURIComponent(username);

  let body: { roles?: string[]; disabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const isSelf = targetUsername.toLowerCase() === session.username.toLowerCase();
  if (isSelf && body.disabled === true) {
    return NextResponse.json({ error: "Der eigene Zugang kann nicht gesperrt werden." }, { status: 400 });
  }
  if (isSelf && Array.isArray(body.roles) && !body.roles.includes(ROLE_ADMIN) && !body.roles.includes(ROLE_SUPERADMIN)) {
    return NextResponse.json(
      { error: "Die eigene Admin-Rolle kann nicht selbst entzogen werden - das würde vom Zugang aussperren." },
      { status: 400 }
    );
  }

  try {
    const client = getCredentialsClient();
    const file = await client.loadAdmins();
    const target = file.users.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (target && !canManageTarget(session, target.roles)) {
      return NextResponse.json(
        { error: "Nur Superadmins dürfen Administrator- oder Superadmin-Zugänge bearbeiten." },
        { status: 403 }
      );
    }
    if (Array.isArray(body.roles)) {
      const roles = body.roles.filter(isAssignableRole);
      if (roles.length === 0) {
        return NextResponse.json({ error: "Mindestens eine gültige Rolle ist erforderlich." }, { status: 400 });
      }
      if (!canAssignRoles(session, roles)) {
        return NextResponse.json(
          { error: "Nur Superadmins dürfen die Rolle Administrator oder Superadmin vergeben." },
          { status: 403 }
        );
      }
      await setRoles(client, { targetUsername, roles, actor: session.username });
    }
    if (typeof body.disabled === "boolean") {
      await setDisabled(client, { targetUsername, disabled: body.disabled, actor: session.username });
    }
  } catch (err) {
    if (err instanceof CredentialsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Online-Benutzerverwaltung: Aktualisieren fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Online-Benutzerverwaltung ist momentan nicht erreichbar. Bitte später erneut versuchen." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
