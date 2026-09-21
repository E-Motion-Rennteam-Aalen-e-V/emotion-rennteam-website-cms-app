import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/change-password/route";
import * as auth from "@/lib/cms/auth";
import * as credentialsRepo from "@/lib/cms/credentialsRepo";
import { createAdmin, login } from "credentials-repo";
import { createRemoteTestStore } from "@/lib/cms/__tests__/remoteTestStore";
import type { CredentialsClient } from "credentials-repo";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/change-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/change-password (Online-Benutzerverwaltung aktiv)", () => {
  let remote: ReturnType<typeof createRemoteTestStore>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CMS_SESSION_SECRET = "a".repeat(32);
    remote = createRemoteTestStore();
    vi.spyOn(credentialsRepo, "isRemoteAuthEnabled").mockReturnValue(true);
    vi.spyOn(credentialsRepo, "getCredentialsClient").mockReturnValue(
      remote.store as unknown as CredentialsClient
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    remote.cleanup();
    vi.restoreAllMocks();
  });

  it("changes a remote user's password and clears mustChangePassword", async () => {
    await createAdmin(remote.store, {
      username: "newbie",
      password: "Temp-Passwort-9!",
      roles: ["Admin"],
      actor: "bootstrap",
      mustChangePassword: true,
    });
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({
      username: "newbie",
      mustChangePassword: true,
      roles: ["Admin"],
    });

    const response = await POST(request({ newPassword: "Brand-New-Passwort-9!" }));
    expect(response.status).toBe(200);

    // The old temporary password must no longer work, the new one must.
    await expect(login(remote.store, "newbie", "Temp-Passwort-9!")).rejects.toThrow();
    const admin = await login(remote.store, "newbie", "Brand-New-Passwort-9!");
    expect(admin.mustChangePassword).toBe(false);
  });

  it("rejects a password that is too weak for the library's real policy", async () => {
    await createAdmin(remote.store, {
      username: "newbie",
      password: "Temp-Passwort-9!",
      roles: ["Admin"],
      actor: "bootstrap",
      mustChangePassword: true,
    });
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({
      username: "newbie",
      mustChangePassword: true,
      roles: ["Admin"],
    });

    // Passes the route's own >=8-char guard but fails the library's real policy.
    const response = await POST(request({ newPassword: "aaaaaaaa" }));
    expect(response.status).toBe(400);
  });

  it("rejects a bootstrap-admin session (no local user, no roles) with a clear 400 instead of silently no-op'ing", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({
      username: "admin",
      mustChangePassword: false,
      roles: [],
    });

    const response = await POST(request({ newPassword: "Brand-New-Passwort-9!" }));
    expect(response.status).toBe(400);
  });
});
