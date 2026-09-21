import { afterEach, describe, expect, it, vi } from "vitest";

const resolveMx = vi.fn();
vi.mock("node:dns/promises", () => {
  const mocked = { resolveMx: (...args: unknown[]) => resolveMx(...args) };
  return { ...mocked, default: mocked };
});

const { hasDeliverableDomain, isMxCheckEnabled } = await import("@/lib/emailDeliverability");

describe("isMxCheckEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled unless ENABLE_EMAIL_MX_CHECK is exactly 'true'", () => {
    expect(isMxCheckEnabled()).toBe(false);
    vi.stubEnv("ENABLE_EMAIL_MX_CHECK", "1");
    expect(isMxCheckEnabled()).toBe(false);
  });

  it("is enabled when ENABLE_EMAIL_MX_CHECK=true", () => {
    vi.stubEnv("ENABLE_EMAIL_MX_CHECK", "true");
    expect(isMxCheckEnabled()).toBe(true);
  });
});

describe("hasDeliverableDomain", () => {
  afterEach(() => {
    resolveMx.mockReset();
  });

  it("returns true when the domain has MX records", async () => {
    resolveMx.mockResolvedValue([{ exchange: "mail.example.com", priority: 10 }]);

    expect(await hasDeliverableDomain("person@example.com")).toBe(true);
  });

  it("returns false when the resolver definitively reports no MX records", async () => {
    const error = Object.assign(new Error("no records"), { code: "ENODATA" });
    resolveMx.mockRejectedValue(error);

    expect(await hasDeliverableDomain("person@no-mx.example")).toBe(false);
  });

  it("returns false for a domain that doesn't exist (ENOTFOUND)", async () => {
    const error = Object.assign(new Error("not found"), { code: "ENOTFOUND" });
    resolveMx.mockRejectedValue(error);

    expect(await hasDeliverableDomain("person@this-domain-does-not-exist.invalid")).toBe(false);
  });

  it("fails open on an inconclusive resolver error", async () => {
    const error = Object.assign(new Error("server failure"), { code: "ESERVFAIL" });
    resolveMx.mockRejectedValue(error);

    expect(await hasDeliverableDomain("person@example.com")).toBe(true);
  });

  it("returns false for an address without a domain part", async () => {
    expect(await hasDeliverableDomain("not-an-email")).toBe(false);
  });
});
