// Test-Hilfsfunktion (kein *.test.ts, wird von Vitest nicht als Testdatei
// ausgefuehrt): baut einen echten LocalFileStore aus dem credentials-repo-
// Paket auf einem temporaeren Verzeichnis auf. Damit koennen Routen-Tests
// login()/createAdmin()/setRoles()/... aus der echten Bibliothek gegen
// echte AES-256-GCM-Verschluesselung laufen lassen, ohne GitHub zu
// kontaktieren - `getCredentialsClient()` wird in den Tests per vi.spyOn auf
// diesen Store umgeleitet.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalFileStore, generateEncryptionKey, loadEncryptionKey } from "credentials-repo";

export function createRemoteTestStore() {
  const dir = mkdtempSync(path.join(tmpdir(), "cms-credentials-test-"));
  const store = new LocalFileStore({
    adminsFilePath: path.join(dir, "admins.json"),
    auditLogPath: path.join(dir, "audit-log.jsonl"),
    encryptionKey: loadEncryptionKey("v1", generateEncryptionKey()),
  });
  return {
    store,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
