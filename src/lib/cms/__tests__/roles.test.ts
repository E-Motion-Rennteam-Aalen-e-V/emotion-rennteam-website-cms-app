import { afterEach, describe, expect, it } from "vitest";
import { accessibleCollectionNames, canAccessCollection, canManageUsers } from "@/lib/cms/roles";

const ALL_COLLECTIONS = ["team", "vehicle", "sponsor", "news", "navItem"] as const;

describe("role-based collection access", () => {
  afterEach(() => {
    delete process.env.CMS_ADMIN_USER;
  });

  it("gives the main CMS_ADMIN_USER access to every collection regardless of roles", () => {
    process.env.CMS_ADMIN_USER = "admin";
    const session = { username: "admin" };
    expect(accessibleCollectionNames(session, ALL_COLLECTIONS)).toEqual([...ALL_COLLECTIONS]);
    expect(canManageUsers(session)).toBe(true);
  });

  it("gives a credentials-repo user with the Admin role access to everything", () => {
    const session = { username: "sarah", roles: ["Admin"] };
    expect(accessibleCollectionNames(session, ALL_COLLECTIONS)).toEqual([...ALL_COLLECTIONS]);
    expect(canManageUsers(session)).toBe(true);
  });

  it("restricts Sponsoring-Management to only the sponsor collection", () => {
    const session = { username: "sponsoruser", roles: ["Sponsoring-Management"] };
    expect(accessibleCollectionNames(session, ALL_COLLECTIONS)).toEqual(["sponsor"]);
    expect(canAccessCollection(session, "sponsor")).toBe(true);
    expect(canAccessCollection(session, "team")).toBe(false);
    expect(canAccessCollection(session, "navItem")).toBe(false);
    expect(canManageUsers(session)).toBe(false);
  });

  it("treats a legacy local user with no roles field as full access (bootstrap behavior)", () => {
    const session = { username: "linda" };
    expect(accessibleCollectionNames(session, ALL_COLLECTIONS)).toEqual([...ALL_COLLECTIONS]);
  });

  it("gives no collection access to a role with no ROLE_COLLECTION_ACCESS entry", () => {
    const session = { username: "ghost", roles: ["Unknown-Role"] };
    expect(accessibleCollectionNames(session, ALL_COLLECTIONS)).toEqual([]);
    expect(canAccessCollection(session, "sponsor")).toBe(false);
  });
});
