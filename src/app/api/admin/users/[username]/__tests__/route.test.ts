import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "@/app/api/admin/users/[username]/route";
import * as auth from "@/lib/cms/auth";
import * as credentialsRepo from "@/lib/cms/credentialsRepo";
import { createAdmin } from "credentials-repo";
import { createRemoteTestStore } from "@/lib/cms/__tests__/remoteTestStore";
import type { CredentialsClient } from "credentials-repo";

function request(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/admin/users/target", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function params(username: string) {
  return { params: Promise.resolve({ username }) };
}

describe("/api/admin/users/[username] (Online-Benutzerverwaltung aktiv)", () => {
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

  function mockSession(session: { username: string; mustChangePassword: boolean; roles: string[] }) {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(session);
  }

  it("DELETE removes a remote admin", async () => {
    await createAdmin(remote.store, { username: "target", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    // Managing an Admin-role target requires a superadmin actor (see
    // roles.ts canManageTarget) - a plain Admin actor gets 403 here.
    mockSession({ username: "alice", mustChangePassword: false, roles: ["superadmin"] });

    const response = await DELETE(request("DELETE"), params("target"));
    expect(response.status).toBe(200);

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "target")).toBeUndefined();
  });

  it("DELETE refuses to remove your own account", async () => {
    await createAdmin(remote.store, { username: "alice", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });

    const response = await DELETE(request("DELETE"), params("alice"));
    expect(response.status).toBe(400);

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "alice")).toBeDefined();
  });

  it("DELETE is case-insensitive when matching 'self' (mixed-case target vs. session username)", async () => {
    await createAdmin(remote.store, { username: "Alice", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });

    const response = await DELETE(request("DELETE"), params("Alice"));
    expect(response.status).toBe(400);
  });

  it("PATCH updates roles for another user", async () => {
    await createAdmin(remote.store, { username: "target", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    // Managing an Admin-role target requires a superadmin actor (see
    // roles.ts canManageTarget) - a plain Admin actor gets 403 here.
    mockSession({ username: "alice", mustChangePassword: false, roles: ["superadmin"] });

    const response = await PATCH(request("PATCH", { roles: ["Sponsoring-Management"] }), params("target"));
    expect(response.status).toBe(200);

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "target")?.roles).toEqual(["Sponsoring-Management"]);
  });

  it("PATCH refuses to let a user strip their own Admin role (self-lockout guard)", async () => {
    await createAdmin(remote.store, { username: "alice", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });

    const response = await PATCH(request("PATCH", { roles: ["Sponsoring-Management"] }), params("alice"));
    expect(response.status).toBe(400);

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "alice")?.roles).toEqual(["Admin"]);
  });

  it("PATCH refuses to let a user disable their own account (self-lockout guard)", async () => {
    await createAdmin(remote.store, { username: "alice", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    mockSession({ username: "alice", mustChangePassword: false, roles: ["Admin"] });

    const response = await PATCH(request("PATCH", { disabled: true }), params("alice"));
    expect(response.status).toBe(400);

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "alice")?.disabled).toBe(false);
  });

  it("PATCH still allows disabling someone else", async () => {
    await createAdmin(remote.store, { username: "target", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    // Managing an Admin-role target requires a superadmin actor (see
    // roles.ts canManageTarget) - a plain Admin actor gets 403 here.
    mockSession({ username: "alice", mustChangePassword: false, roles: ["superadmin"] });

    const response = await PATCH(request("PATCH", { disabled: true }), params("target"));
    expect(response.status).toBe(200);

    const file = await remote.store.loadAdmins();
    expect(file.users.find((u) => u.username === "target")?.disabled).toBe(true);
  });

  it("PATCH rejects an empty role list instead of silently locking the target account out of every role", async () => {
    await createAdmin(remote.store, { username: "target", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    // Managing an Admin-role target requires a superadmin actor (see
    // roles.ts canManageTarget) - a plain Admin actor gets 403 here, which
    // would mask the empty-role-list check this test is actually about.
    mockSession({ username: "alice", mustChangePassword: false, roles: ["superadmin"] });

    const response = await PATCH(request("PATCH", { roles: [] }), params("target"));
    expect(response.status).toBe(400);
  });

  it("PATCH filters out unknown role strings and 400s if nothing valid remains", async () => {
    await createAdmin(remote.store, { username: "target", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    // Superadmin actor, see comment above.
    mockSession({ username: "alice", mustChangePassword: false, roles: ["superadmin"] });

    // "superadmin" is now itself a real assignable role (see roles.ts) so
    // it no longer belongs in the "unknown role" payload here - use two
    // genuinely invalid strings so isAssignableRole filters out both.
    const response = await PATCH(
      request("PATCH", { roles: ["not-a-role", "also-not-a-role"] }),
      params("target")
    );
    expect(response.status).toBe(400);
  });

  it("rejects a caller without the Admin role for both DELETE and PATCH", async () => {
    await createAdmin(remote.store, { username: "target", password: "Correct-Horse-9!", roles: ["Admin"], actor: "x" });
    mockSession({ username: "sponsor", mustChangePassword: false, roles: ["Sponsoring-Management"] });

    expect((await DELETE(request("DELETE"), params("target"))).status).toBe(403);
    expect((await PATCH(request("PATCH", { disabled: true }), params("target"))).status).toBe(403);
  });
});
