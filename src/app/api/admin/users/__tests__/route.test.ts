import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/users/route";
import * as auth from "@/lib/cms/auth";
import * as credentialsRepo from "@/lib/cms/credentialsRepo";
import { createAdmin } from "credentials-repo";
import { createRemoteTestStore } from "@/lib/cms/__tests__/remoteTestStore";
import type { CredentialsClient } from "credentials-repo";

function request(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/users", {
    method,
    headers: { "content-type": "application/json", cookie: "cms_session=irrelevant-mocked" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/admin/users (Online-Benutzerverwaltung aktiv)", () => {
  let remote: ReturnType<typeof createRemoteTestStore>;

  beforeEach(() => {
    remote = createRemoteTestStore();
    vi.spyOn(credentialsRepo, "isRemoteAuthEnabled").mockReturnValue(true);
    vi.spyOn(credentialsRepo, "getCredentialsClient").mockReturnValue(
      remote.store as unknown as CredentialsClient
    );
  });

  afterEach(() => {
    remote.cleanup();
    vi.restoreAllMocks();
  });

  function mockSession(session: { username: string; mustChangePassword: boolean; roles: string[] } | null) {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(session);
  }

  it("GET rejects an unauthenticated caller", async () => {
    mockSession(null);
    const response = await GET(request("GET"));
    expect(response.status).toBe(401);
  });

  it("GET rejects a caller without the Admin role", async () => {
    mockSession({ username: "sponsor", mustChangePassword: false, roles: ["Sponsoring-Management"] });
    const response = await GET(request("GET"));
    expect(response.status).toBe(403);
  });

  it("GET lists remote admins with their roles/disabled/mustChangePassword flags", async () => {
    await createAdmin(remote.store, { username: "alice", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });

    const response = await GET(request("GET"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.remote).toBe(true);
    expect(json.users).toEqual([
      expect.objectContaining({ username: "alice", roles: ["Admin"], disabled: false }),
    ]);
  });

  it("POST creates a new remote admin with the requested roles", async () => {
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });

    const response = await POST(
      request("POST", {
        username: "bob",
        temporaryPassword: "Temp-Passwort-9!",
        roles: ["Sponsoring-Management"],
      })
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);

    const file = await remote.store.loadAdmins();
    const bob = file.users.find((u) => u.username === "bob");
    expect(bob).toBeDefined();
    expect(bob?.roles).toEqual(["Sponsoring-Management"]);
    expect(bob?.mustChangePassword).toBe(true);
  });

  it("POST defaults to the Admin role when no valid role is supplied", async () => {
    // Only superadmins get the implicit Admin-role default (see roles.ts /
    // route.ts: a non-superadmin actor supplying no assignable role gets a
    // 400 instead, since it can't assign Admin itself).
    mockSession({ username: "alice", mustChangePassword: false, roles: ["superadmin"] });

    await POST(
      request("POST", { username: "charlie", temporaryPassword: "Temp-Passwort-9!", roles: ["not-a-real-role"] })
    );

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "charlie")?.roles).toEqual(["Admin"]);
  });

  it("POST rejects a temporary password that is too weak for the library's real policy, even though it clears our 8-char check", async () => {
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });

    // 8 chars, single character class - passes our own >=8 guard but fails
    // the library's assertPasswordPolicy (11 chars minimum, 3 of 4 classes).
    // Role kept non-privileged (Admin/superadmin need a superadmin actor to
    // assign, see roles.ts canAssignRoles) so this exercises the password
    // check, not the role-assignment permission check.
    const response = await POST(
      request("POST", { username: "dora", temporaryPassword: "aaaaaaaa", roles: ["Sponsoring-Management"] })
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Zeichen/);

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "dora")).toBeUndefined();
  });

  it("POST rejects creating a duplicate username with a 400, not a 502", async () => {
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });
    await createAdmin(remote.store, { username: "eve", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });

    // Role kept non-privileged, see comment above - this test is about the
    // duplicate-username check, not the role-assignment permission check.
    const response = await POST(
      request("POST", { username: "eve", temporaryPassword: "Correct-Horse-9!", roles: ["Sponsoring-Management"] })
    );
    expect(response.status).toBe(400);
  });
});
