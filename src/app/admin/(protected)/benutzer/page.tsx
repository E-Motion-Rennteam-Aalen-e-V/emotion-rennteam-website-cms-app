import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/cms/auth";
import { listUsers } from "@/lib/cms/users";
import { canManageUsers, isSuperadmin } from "@/lib/cms/roles";
import { isRemoteAuthEnabled, getCredentialsClient } from "@/lib/cms/credentialsRepo";
import UserManager from "@/components/admin/UserManager";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  if (!canManageUsers(session)) redirect("/admin");

  const remote = isRemoteAuthEnabled();
  let initialUsers: { username: string; mustChangePassword: boolean; roles: string[]; disabled: boolean }[] = [];
  let loadError: string | null = null;

  if (remote) {
    try {
      const file = await getCredentialsClient().loadAdmins({ forceRefresh: true });
      initialUsers = file.users.map((u) => ({
        username: u.username,
        mustChangePassword: u.mustChangePassword,
        roles: u.roles,
        disabled: u.disabled,
      }));
    } catch (err) {
      // Serverseitiges Rendern darf hier nicht mit einer 500-Fehlerseite
      // abbrechen, nur weil GitHub kurz nicht erreichbar ist - stattdessen
      // die Seite mit leerer Liste + Fehlermeldung anzeigen (das clientseitige
      // "Aktualisieren" in UserManager kann es danach erneut versuchen).
      console.error("Online-Benutzerverwaltung: Laden fehlgeschlagen:", err);
      loadError = "Online-Benutzerverwaltung ist momentan nicht erreichbar. Bitte die Seite neu laden.";
    }
  } else {
    initialUsers = listUsers().map(({ username, mustChangePassword }) => ({
      username,
      mustChangePassword,
      roles: [],
      disabled: false,
    }));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Benutzerverwaltung</h1>
        <p className="text-sm text-muted">
          Lege weitere Redaktions-Zugänge an – z. B. für Teamkolleg:innen, die von ihrem eigenen Gerät aus
          Inhalte pflegen sollen. Jede:r neue Nutzer:in vergibt beim ersten Login ein eigenes, nur ihr/ihm
          bekanntes Passwort.
          {remote && " Zugänge, Rollen und Passwort-Hashes werden verschlüsselt in der Online-Benutzerverwaltung gespeichert."}
        </p>
      </div>
      <UserManager
        adminUsername={session.username}
        initialUsers={initialUsers}
        remote={remote}
        initialError={loadError}
        canAssignPrivilegedRoles={isSuperadmin(session)}
      />
    </div>
  );
}
