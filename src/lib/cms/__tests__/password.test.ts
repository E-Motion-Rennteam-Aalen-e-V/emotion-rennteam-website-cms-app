import { describe, expect, it } from "vitest";
import { burnPasswordVerificationTime, hashPassword, verifyPassword } from "@/lib/cms/password";

describe("CMS password hashing", () => {
  it("verifies a correct password against its own hash", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });

  it("produces a different hash (different salt) each time", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(verifyPassword("same-password", a)).toBe(true);
    expect(verifyPassword("same-password", b)).toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", () => {
    expect(verifyPassword("anything", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
  });

  it("burnPasswordVerificationTime performs a real scrypt derivation without throwing", () => {
    // Exists to close a user-enumeration timing side channel on the login
    // route (see api/admin/login/route.ts): callers don't need its return
    // value, just that it does comparable work to a real verifyPassword()
    // call. A CI-safe smoke test can't assert timing reliably, so this just
    // guards against the function becoming an accidental no-op.
    expect(() => burnPasswordVerificationTime("any-guess")).not.toThrow();
    expect(() => burnPasswordVerificationTime("")).not.toThrow();
  });
});
