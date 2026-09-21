import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/login/route";
import * as users from "@/lib/cms/users";
import * as password from "@/lib/cms/password";

function loginRequest(body: unknown, ip = `1.9.9.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/login", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set so the "server not configured" guard doesn't fire before we
    // reach the findUser() branch under test.
    process.env.CMS_ADMIN_USER = "admin";
    process.env.CMS_ADMIN_PASSWORD_HASH = "irrelevant-for-these-tests:irrelevant";
    process.env.CMS_SESSION_SECRET = "a".repeat(32);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("burns comparable scrypt time instead of short-circuiting for a nonexistent username", async () => {
    vi.spyOn(users, "findUser").mockReturnValue(undefined);
    const burnSpy = vi.spyOn(password, "burnPasswordVerificationTime");

    const response = await POST(loginRequest({ username: "nobody", password: "whatever" }, "1.9.9.1"));

    expect(response.status).toBe(401);
    expect(burnSpy).toHaveBeenCalledWith("whatever");
  });

  it("does not burn dummy time for an existing user with a wrong password (real scrypt already ran)", async () => {
    vi.spyOn(users, "findUser").mockReturnValue({
      username: "editor",
      passwordHash: "somesalt:somehash",
      mustChangePassword: false,
    });
    vi.spyOn(password, "verifyPassword").mockReturnValue(false);
    const burnSpy = vi.spyOn(password, "burnPasswordVerificationTime");

    const response = await POST(loginRequest({ username: "editor", password: "wrong" }, "1.9.9.2"));

    expect(response.status).toBe(401);
    expect(burnSpy).not.toHaveBeenCalled();
  });

  it("authenticates an existing user with the correct password", async () => {
    vi.spyOn(users, "findUser").mockReturnValue({
      username: "editor",
      passwordHash: "somesalt:somehash",
      mustChangePassword: false,
    });
    vi.spyOn(password, "verifyPassword").mockReturnValue(true);

    const response = await POST(loginRequest({ username: "editor", password: "correct" }, "1.9.9.3"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(response.headers.get("set-cookie")).toMatch(/cms_session=/);
  });
});
