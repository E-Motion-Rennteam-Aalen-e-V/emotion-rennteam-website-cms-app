import { afterEach, describe, expect, it, vi } from "vitest";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";

describe("isTurnstileEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled without a secret key", () => {
    expect(isTurnstileEnabled()).toBe(false);
  });

  it("is enabled once TURNSTILE_SECRET_KEY is set", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(isTurnstileEnabled()).toBe(true);
  });
});

describe("verifyTurnstileToken", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects an empty token without calling Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    expect(await verifyTurnstileToken("", "1.2.3.4")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes through when not enabled (no secret key configured)", async () => {
    expect(await verifyTurnstileToken("some-token", "1.2.3.4")).toBe(true);
  });

  it("accepts a token Cloudflare confirms as valid", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    expect(await verifyTurnstileToken("valid-token", "1.2.3.4")).toBe(true);
  });

  it("rejects a token Cloudflare reports as invalid", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 })
    );

    expect(await verifyTurnstileToken("bad-token", "1.2.3.4")).toBe(false);
  });

  it("fails open when the verification request itself errors", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await verifyTurnstileToken("some-token", "1.2.3.4")).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
