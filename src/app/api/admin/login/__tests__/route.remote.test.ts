import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/login/route";
import * as credentialsRepo from "@/lib/cms/credentialsRepo";
import { createAdmin } from "credentials-repo";
import { createRemoteTestStore } from "@/lib/cms/__tests__/remoteTestStore";
import type { CredentialsClient } from "credentials-repo";

function loginRequest(body: unknown, ip = `2.9.9.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/login (Online-Benutzerverwaltung)", () => {
  const originalEnv = { ...process.env };
  let remote: ReturnType<typeof createRemoteTestStore>;

  beforeEach(() => {
    delete process.env.CMS_ADMIN_USER;
    delete process.env.CMS_ADMIN_PASSWORD_HASH;
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

  it("logs a remote admin in and carries their roles into the session cookie", async () => {
    await createAdmin(remote.store, {
      username: "sarah",
      password: "Correct-Horse-Battery9!",
      roles: ["Admin", "Sponsoring-Management"],
      actor: "bootstrap",
    });

    const response = await POST(loginRequest({ username: "sarah", password: "Correct-Horse-Battery9!" }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/cms_session=/);

    // Rollen im Token muessen fuer canManageUsers() erhalten bleiben.
    const { verifySessionToken } = await import("@/lib/cms/auth");
    const tokenMatch = cookie.match(/cms_session=([^;]+)/);
    const session = await verifySessionToken(decodeURIComponent(tokenMatch![1]));
    expect(session?.roles).toEqual(["Admin", "Sponsoring-Management"]);
  });

  it("rejects a remote admin with the wrong password with a generic 401", async () => {
    await createAdmin(remote.store, {
      username: "linda",
      password: "Correct-Horse-Battery9!",
      roles: ["Admin"],
      actor: "bootstrap",
    });

    const response = await POST(loginRequest({ username: "linda", password: "wrong-password" }));
    expect(response.status).toBe(401);
  });

  it("locks the account out after repeated failures and reports 423", async () => {
    await createAdmin(remote.store, {
      username: "locked-user",
      password: "Correct-Horse-Battery9!",
      roles: ["Admin"],
      actor: "bootstrap",
    });

    // Lockout-Schwelle in der Bibliothek liegt bei 5 Fehlversuchen.
    for (let i = 0; i < 5; i++) {
      await POST(loginRequest({ username: "locked-user", password: "wrong" }, `2.9.9.${100 + i}`));
    }
    const response = await POST(loginRequest({ username: "locked-user", password: "wrong" }, "2.9.9.200"));
    expect(response.status).toBe(423);
  });

  it("rejects a disabled account with 403", async () => {
    const { setDisabled } = await import("credentials-repo");
    await createAdmin(remote.store, {
      username: "disabled-user",
      password: "Correct-Horse-Battery9!",
      roles: ["Admin"],
      actor: "bootstrap",
    });
    await setDisabled(remote.store, { targetUsername: "disabled-user", disabled: true, actor: "bootstrap" });

    const response = await POST(
      loginRequest({ username: "disabled-user", password: "Correct-Horse-Battery9!" })
    );
    expect(response.status).toBe(403);
  });

  it("surfaces an unreachable online-user-management as 502 instead of a generic 401", async () => {
    vi.spyOn(credentialsRepo, "getCredentialsClient").mockImplementation(() => {
      throw new Error("network unreachable");
    });

    const response = await POST(loginRequest({ username: "anyone", password: "whatever" }));
    expect(response.status).toBe(502);
  });

  it("still allows the local bootstrap admin to log in when the online store is also configured", async () => {
    process.env.CMS_ADMIN_USER = "admin";
    // scrypt hash for password "bootstrap-pw" precomputed is unnecessary -
    // we spy on verifyPassword indirectly by using the real local hash flow.
    const { hashPassword } = await import("@/lib/cms/password");
    process.env.CMS_ADMIN_PASSWORD_HASH = hashPassword("bootstrap-pw");

    const response = await POST(loginRequest({ username: "admin", password: "bootstrap-pw" }));
    expect(response.status).toBe(200);
  });
});
