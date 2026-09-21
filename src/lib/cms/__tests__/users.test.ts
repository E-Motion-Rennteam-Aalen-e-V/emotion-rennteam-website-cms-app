import { beforeEach, describe, expect, it, vi } from "vitest";

let fakeFile: string | undefined;

vi.mock("node:fs", () => {
  const existsSync = vi.fn(() => fakeFile !== undefined);
  const readFileSync = vi.fn(() => fakeFile ?? "");
  const writeFileSync = vi.fn((_path: string, contents: string) => {
    fakeFile = contents;
  });
  // writeStore() now writes to a temp path and renameSync()s it into place
  // for atomicity - the temp write above already lands in `fakeFile`, so the
  // rename is a no-op here (the mock doesn't model distinct file paths).
  const renameSync = vi.fn(() => {});
  return {
    existsSync,
    readFileSync,
    writeFileSync,
    renameSync,
    default: { existsSync, readFileSync, writeFileSync, renameSync },
  };
});

import { deleteUser, findUser, listUsers, setUserPassword, upsertUser } from "@/lib/cms/users";

describe("CMS user store", () => {
  beforeEach(() => {
    fakeFile = undefined;
  });

  it("starts empty when no store file exists", () => {
    expect(listUsers()).toEqual([]);
    expect(findUser("linda")).toBeUndefined();
  });

  it("creates a new user with a forced password change", () => {
    upsertUser("linda", "hash1");
    const user = findUser("linda");
    expect(user).toEqual({ username: "linda", passwordHash: "hash1", mustChangePassword: true });
  });

  it("lets a user set their own password, clearing the forced-change flag", () => {
    upsertUser("linda", "hash1");
    const updated = setUserPassword("linda", "hash2");
    expect(updated).toBe(true);
    expect(findUser("linda")).toEqual({ username: "linda", passwordHash: "hash2", mustChangePassword: false });
  });

  it("returns false when setting a password for an unknown user", () => {
    expect(setUserPassword("ghost", "hash")).toBe(false);
  });

  it("resetting an existing user's password re-forces a password change", () => {
    upsertUser("linda", "hash1");
    setUserPassword("linda", "hash2");
    upsertUser("linda", "temp-hash");
    expect(findUser("linda")).toEqual({ username: "linda", passwordHash: "temp-hash", mustChangePassword: true });
  });

  it("deletes a user", () => {
    upsertUser("linda", "hash1");
    expect(deleteUser("linda")).toBe(true);
    expect(findUser("linda")).toBeUndefined();
    expect(deleteUser("linda")).toBe(false);
  });

  it("keeps multiple users independent", () => {
    upsertUser("linda", "hash1");
    upsertUser("max", "hash2");
    expect(listUsers()).toHaveLength(2);
    deleteUser("linda");
    expect(listUsers()).toEqual([{ username: "max", passwordHash: "hash2", mustChangePassword: true }]);
  });
});
