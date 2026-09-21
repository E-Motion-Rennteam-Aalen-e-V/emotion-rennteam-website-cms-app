import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCredentialsClient, isRemoteAuthEnabled, _resetCredentialsClientForTesting } from "@/lib/cms/credentialsRepo";

describe("credentialsRepo", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    _resetCredentialsClientForTesting();
    delete process.env.CMS_CREDENTIALS_OWNER;
    delete process.env.CMS_CREDENTIALS_REPO;
    delete process.env.CMS_CREDENTIALS_TOKEN;
    delete process.env.CMS_CREDENTIALS_ENCRYPTION_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    _resetCredentialsClientForTesting();
  });

  it("is disabled when none of the env vars are set", () => {
    expect(isRemoteAuthEnabled()).toBe(false);
  });

  it.each(["CMS_CREDENTIALS_OWNER", "CMS_CREDENTIALS_REPO", "CMS_CREDENTIALS_TOKEN", "CMS_CREDENTIALS_ENCRYPTION_KEY"])(
    "stays disabled if only %s is set",
    (onlyVar) => {
      process.env[onlyVar] = "x";
      expect(isRemoteAuthEnabled()).toBe(false);
    }
  );

  it("is enabled only once all four env vars are set", () => {
    process.env.CMS_CREDENTIALS_OWNER = "org";
    process.env.CMS_CREDENTIALS_REPO = "repo";
    process.env.CMS_CREDENTIALS_TOKEN = "token";
    process.env.CMS_CREDENTIALS_ENCRYPTION_KEY = "key";
    expect(isRemoteAuthEnabled()).toBe(true);
  });

  it("throws a descriptive error instead of constructing a broken client when not configured", () => {
    expect(() => getCredentialsClient()).toThrow(/serverseitig nicht konfiguriert/);
  });

  it("rejects a malformed (non-32-byte) encryption key instead of silently building a broken client", () => {
    process.env.CMS_CREDENTIALS_OWNER = "org";
    process.env.CMS_CREDENTIALS_REPO = "repo";
    process.env.CMS_CREDENTIALS_TOKEN = "token";
    process.env.CMS_CREDENTIALS_ENCRYPTION_KEY = "too-short";
    expect(() => getCredentialsClient()).toThrow();
  });

  it("caches the client instance across calls", () => {
    process.env.CMS_CREDENTIALS_OWNER = "org";
    process.env.CMS_CREDENTIALS_REPO = "repo";
    process.env.CMS_CREDENTIALS_TOKEN = "token";
    process.env.CMS_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const a = getCredentialsClient();
    const b = getCredentialsClient();
    expect(a).toBe(b);
  });
});
