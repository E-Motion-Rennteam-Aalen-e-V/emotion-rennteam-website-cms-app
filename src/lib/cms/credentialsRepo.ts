// Bindung an das private "credentials-repo"-Paket (separates GitHub-Repo
// E-Motion-Rennteam-Aalen-e-V/Login-Benutzerverwaltung): Admin-Zugaenge,
// Passwort-Hashes und Rollen werden dort verschluesselt online gespeichert,
// statt nur lokal in .cms-users.json. Token und Verschluesselungsschluessel
// leben ausschliesslich in Server-Env-Variablen - sie werden nie an den
// Browser gesendet und der Redakteur muss sie nirgends eingeben.
//
// Bewusst getrennte Env-Variablen von GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO
// (die bereits fuer die Inhalts-Commits der Haupt-Website verwendet werden,
// siehe github.ts) - ein kompromittiertes Content-Token darf keinen Zugriff
// auf die Zugangsdaten-Repo bekommen und umgekehrt (Prinzip der
// Aufgabentrennung, siehe SECURITY.md im credentials-repo).
import {
  CredentialsClient,
  loadEncryptionKey,
} from "credentials-repo";

export {
  login,
  createAdmin,
  changePassword,
  setRoles,
  setDisabled,
  removeAdmin,
  AccountLockedError,
  AccountDisabledError,
  InvalidCredentialsError,
  CredentialsError,
  CredentialsConflictError,
  GitHubApiError,
  WeakPasswordError,
} from "credentials-repo";
export type { Admin, CreateAdminInput } from "credentials-repo";

let cachedClient: CredentialsClient | null = null;

export function isRemoteAuthEnabled(): boolean {
  return Boolean(
    process.env.CMS_CREDENTIALS_OWNER &&
      process.env.CMS_CREDENTIALS_REPO &&
      process.env.CMS_CREDENTIALS_TOKEN &&
      process.env.CMS_CREDENTIALS_ENCRYPTION_KEY
  );
}

/** Lazily erzeugter, wiederverwendeter Client (haelt den Read-Cache der Bibliothek zwischen Requests warm). */
export function getCredentialsClient(): CredentialsClient {
  if (cachedClient) return cachedClient;

  if (!isRemoteAuthEnabled()) {
    throw new Error(
      "Online-Benutzerverwaltung ist serverseitig nicht konfiguriert " +
        "(CMS_CREDENTIALS_OWNER/CMS_CREDENTIALS_REPO/CMS_CREDENTIALS_TOKEN/CMS_CREDENTIALS_ENCRYPTION_KEY fehlen)."
    );
  }

  cachedClient = new CredentialsClient({
    owner: process.env.CMS_CREDENTIALS_OWNER!,
    repo: process.env.CMS_CREDENTIALS_REPO!,
    token: process.env.CMS_CREDENTIALS_TOKEN!,
    encryptionKey: loadEncryptionKey(
      process.env.CMS_CREDENTIALS_KEY_ID ?? "v1",
      process.env.CMS_CREDENTIALS_ENCRYPTION_KEY!
    ),
    commitAuthorName: "e-motion-cms-bot",
    commitAuthorEmail: "cms-bot@users.noreply.github.com",
  });
  return cachedClient;
}

/** Test-only: verwirft den gecachten Client, damit Tests mit wechselnder Env-Konfiguration nicht denselben Client wiederverwenden. */
export function _resetCredentialsClientForTesting(): void {
  cachedClient = null;
}
