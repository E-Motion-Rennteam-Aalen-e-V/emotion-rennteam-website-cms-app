// Rollen für Admin-Zugänge, die über das private Credentials-Repo
// (siehe credentialsRepo.ts) verwaltet werden. Bewusst als offene Liste
// gehalten wie im credentials-repo-Paket selbst - neue Rollen lassen sich
// hier ergänzen, ohne das Paket anfassen zu muessen.

/** Uneingeschraenkter Zugang: verwaltet Inhalte, Benutzer UND andere Admins/Superadmins. */
export const ROLE_SUPERADMIN = "superadmin";
/** Voller Content-Zugriff + darf Benutzer anlegen, aber keine Admin-/Superadmin-Zugaenge antasten. */
export const ROLE_ADMIN = "Admin";
/** Nur Zugriff auf die Sponsoring-Inhalte. */
export const ROLE_SPONSORING = "Sponsoring-Management";

/** Rollen, die im CMS-Panel bei der Anlage/Bearbeitung eines Zugangs zur Auswahl stehen. */
export const ASSIGNABLE_ROLES = [ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_SPONSORING] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Rollen, die nur ein Superadmin vergeben, entziehen oder deren Träger nur ein Superadmin bearbeiten darf. */
const PRIVILEGED_ROLES: readonly string[] = [ROLE_SUPERADMIN, ROLE_ADMIN];

export function isAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

interface SessionLike {
  username: string;
  roles?: string[];
}

export function isBreakGlassAdmin(session: SessionLike): boolean {
  return Boolean(process.env.CMS_ADMIN_USER) && session.username === process.env.CMS_ADMIN_USER;
}

/**
 * Superadmin: der Hauptadministrator (CMS_ADMIN_USER, Break-Glass-Zugang)
 * sowie jeder Zugang mit der Rolle "superadmin" aus dem Credentials-Repo.
 * Nur Superadmins duerfen andere Admin-/Superadmin-Zugaenge anlegen,
 * bearbeiten oder entfernen.
 */
export function isSuperadmin(session: SessionLike): boolean {
  if (isBreakGlassAdmin(session)) return true;
  return Boolean(session.roles?.includes(ROLE_SUPERADMIN));
}

/**
 * Der Hauptadministrator (CMS_ADMIN_USER) darf immer Benutzer verwalten -
 * unabhaengig davon, ob das Credentials-Repo konfiguriert ist (Break-Glass-
 * Zugang). Darueber hinaus duerfen Zugaenge mit der Rolle "superadmin" oder
 * "Admin" aus dem Credentials-Repo ebenfalls Benutzer verwalten;
 * "Sponsoring-Management" ist auf die eigenen Inhalte beschraenkt.
 */
export function canManageUsers(session: SessionLike): boolean {
  if (isBreakGlassAdmin(session)) return true;
  return Boolean(session.roles?.some((role) => role === ROLE_SUPERADMIN || role === ROLE_ADMIN));
}

/**
 * Ob `actor` die Rollen-Zuweisung `roles` an einem Zugang vornehmen darf.
 * Nur Superadmins duerfen "superadmin" oder "Admin" vergeben/entziehen.
 */
export function canAssignRoles(actor: SessionLike, roles: readonly string[]): boolean {
  if (isSuperadmin(actor)) return true;
  return !roles.some((role) => PRIVILEGED_ROLES.includes(role));
}

/**
 * Ob `actor` einen Zugang mit den aktuellen Rollen `targetRoles` ueberhaupt
 * bearbeiten/entfernen darf. Nicht-Superadmins duerfen keine Admin- oder
 * Superadmin-Zugaenge antasten (auch nicht sperren/loeschen).
 */
export function canManageTarget(actor: SessionLike, targetRoles: readonly string[]): boolean {
  if (isSuperadmin(actor)) return true;
  return !targetRoles.some((role) => PRIVILEGED_ROLES.includes(role));
}

/**
 * Welche Content-Collection(-Namen aus collections.ts) eine nicht-Admin-Rolle
 * im CMS-Panel sehen und bearbeiten darf. Fehlt eine Rolle hier, hat sie
 * (ausser Admin) auf keine Collection Zugriff.
 */
const ROLE_COLLECTION_ACCESS: Record<string, readonly string[]> = {
  [ROLE_SPONSORING]: ["sponsor"],
};

function isFullAccess(session: SessionLike): boolean {
  if (isSuperadmin(session)) return true;
  if (session.roles?.includes(ROLE_ADMIN)) return true;
  // Lokale/Bootstrap-Nutzer aus der Legacy-Liste (.cms-users.json) tragen
  // keine Rollen aus der Online-Benutzerverwaltung - fuer sie galt bisher
  // immer voller Zugriff, das bleibt so (reine Aufteilung nach Rollen gibt
  // es nur fuer Zugaenge aus dem Credentials-Repo).
  if (!session.roles || session.roles.length === 0) return true;
  return false;
}

/** Ob dieser Zugang die angegebene Content-Collection sehen/bearbeiten darf. */
export function canAccessCollection(session: SessionLike, collectionName: string): boolean {
  if (isFullAccess(session)) return true;
  return Boolean(session.roles?.some((role) => ROLE_COLLECTION_ACCESS[role]?.includes(collectionName)));
}

/** Liste der Collection-Namen, auf die dieser Zugang Zugriff hat (für die Sidebar/Übersicht). */
export function accessibleCollectionNames(session: SessionLike, allCollectionNames: readonly string[]): string[] {
  if (isFullAccess(session)) return [...allCollectionNames];
  const allowed = new Set<string>();
  for (const role of session.roles ?? []) {
    for (const name of ROLE_COLLECTION_ACCESS[role] ?? []) allowed.add(name);
  }
  return allCollectionNames.filter((name) => allowed.has(name));
}
