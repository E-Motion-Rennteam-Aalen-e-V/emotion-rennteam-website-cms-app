import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { _getTrackedBucketCountForTesting, checkRateLimit, getClientIp } from "@/lib/rateLimit";

function requestWithHeaders(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/contact", { headers });
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the configured limit", async () => {
    const key = `test-${Math.random()}`;
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
    expect(await checkRateLimit(key, 3, 60_000)).toBe(true);
  });

  it("blocks requests once the limit is exceeded", async () => {
    const key = `test-${Math.random()}`;
    await checkRateLimit(key, 2, 60_000);
    await checkRateLimit(key, 2, 60_000);
    expect(await checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it("keeps separate counters per key", async () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    await checkRateLimit(keyA, 1, 60_000);
    expect(await checkRateLimit(keyA, 1, 60_000)).toBe(false);
    expect(await checkRateLimit(keyB, 1, 60_000)).toBe(true);
  });

  it("resets the counter once the window has elapsed", async () => {
    vi.useFakeTimers();
    const key = `test-window-${Math.random()}`;
    expect(await checkRateLimit(key, 1, 1_000)).toBe(true);
    expect(await checkRateLimit(key, 1, 1_000)).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(await checkRateLimit(key, 1, 1_000)).toBe(true);
    vi.useRealTimers();
  });

  it("evicts expired buckets instead of growing the in-memory map forever", async () => {
    // Without eviction, one bucket per distinct key would stay in memory
    // for the life of the process — e.g. an attacker cycling through
    // spoofed `x-forwarded-for` values, or just many years of real
    // visitors. Fill past the internal cap with short-lived, now-expired
    // buckets and confirm a later call sweeps them out rather than
    // letting the map grow past its bound.
    vi.useFakeTimers();
    const overflowPrefix = `overflow-${Math.random()}-`;
    const bucketsToFill = 5_000; // matches MAX_TRACKED_BUCKETS in rateLimit.ts
    for (let i = 0; i < bucketsToFill; i += 1) {
      await checkRateLimit(`${overflowPrefix}${i}`, 1, 1_000);
    }
    expect(_getTrackedBucketCountForTesting()).toBeGreaterThanOrEqual(bucketsToFill);

    vi.advanceTimersByTime(1_001);
    await checkRateLimit(`${overflowPrefix}trigger`, 1, 1_000);

    // The sweep should have dropped all the now-expired buckets, leaving
    // only the freshly inserted one (plus whatever unrelated, unexpired
    // buckets other tests in this run happen to hold).
    expect(_getTrackedBucketCountForTesting()).toBeLessThan(bucketsToFill);
    vi.useRealTimers();
  });

  it("still enforces the cap when a flood of distinct keys never expires", async () => {
    // A sweep only reclaims *expired* buckets. If an attacker (or a genuine
    // traffic spike) sends more distinct keys than the cap within a single
    // window — so nothing has expired yet when the cap is hit — the sweep
    // above finds nothing to remove. Without a fallback eviction, the map
    // would keep growing past MAX_TRACKED_BUCKETS for as long as the flood
    // lasts. Confirm the cap holds even in that case.
    vi.useFakeTimers();
    const overflowPrefix = `sustained-${Math.random()}-`;
    const maxTrackedBuckets = 5_000; // matches MAX_TRACKED_BUCKETS in rateLimit.ts
    const floodSize = maxTrackedBuckets + 500;

    for (let i = 0; i < floodSize; i += 1) {
      // A long window (10 minutes) so none of these buckets expire during
      // this test — mirrors the real form routes' rate-limit windows.
      await checkRateLimit(`${overflowPrefix}${i}`, 1, 10 * 60_000);
    }

    expect(_getTrackedBucketCountForTesting()).toBeLessThanOrEqual(maxTrackedBuckets);
    vi.useRealTimers();
  });

  it("uses the shared Upstash Redis store when configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 })
    );

    const allowed = await checkRateLimit(`redis-${Math.random()}`, 3, 60_000);

    expect(allowed).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.upstash.io/pipeline",
      expect.objectContaining({ method: "POST" })
    );

    fetchMock.mockRestore();
    vi.unstubAllEnvs();
  });

  it("falls back to the in-memory limiter when Upstash requests fail", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const allowed = await checkRateLimit(`redis-fallback-${Math.random()}`, 3, 60_000);

    expect(allowed).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();

    fetchMock.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});

describe("getClientIp", () => {
  it("uses the single x-forwarded-for value when there's only one", () => {
    expect(getClientIp(requestWithHeaders({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("uses the last x-forwarded-for entry, not the client-controlled first one", () => {
    // A client can prepend anything before the request reaches the trusted
    // proxy; only the last entry is the one the proxy itself appended.
    // Trusting the first entry would let anyone dodge rate limiting by
    // sending a different spoofed value on every request.
    const header = "9.9.9.9, 198.51.100.20, 203.0.113.99";
    expect(getClientIp(requestWithHeaders({ "x-forwarded-for": header }))).toBe("203.0.113.99");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(requestWithHeaders({ "x-real-ip": "203.0.113.55" }))).toBe("203.0.113.55");
  });

  it("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(requestWithHeaders({}))).toBe("unknown");
  });
});
