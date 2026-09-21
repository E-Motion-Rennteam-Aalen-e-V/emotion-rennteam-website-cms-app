import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/cms/auth";

describe("CMS session tokens", () => {
  beforeEach(() => {
    process.env.CMS_SESSION_SECRET = "test-secret-at-least-16-chars-long";
  });

  it("round-trips a valid token", async () => {
    const token = await createSessionToken("admin");
    const session = await verifySessionToken(token);
    expect(session).toEqual({ username: "admin", mustChangePassword: false, roles: [] });
  });

  it("round-trips a token that requires a password change", async () => {
    const token = await createSessionToken("linda", true);
    const session = await verifySessionToken(token);
    expect(session).toEqual({ username: "linda", mustChangePassword: true, roles: [] });
  });

  it("round-trips a token carrying roles from the online credentials repo", async () => {
    const token = await createSessionToken("sarah", false, ["Admin", "Sponsoring-Management"]);
    const session = await verifySessionToken(token);
    expect(session).toEqual({ username: "sarah", mustChangePassword: false, roles: ["Admin", "Sponsoring-Management"] });
  });

  it("rejects a tampered signature", async () => {
    const token = await createSessionToken("admin");
    const [payload, signature] = token.split(".");
    const tampered = `${payload}.${signature.slice(0, -2)}xx`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const token = await createSessionToken("admin");
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ u: "attacker", exp: Math.floor(Date.now() / 1000) + 3600 }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(process.env.CMS_SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const payload = { u: "admin", exp: Math.floor(Date.now() / 1000) - 10 };
    const payloadB64 = Buffer.from(JSON.stringify(payload))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
    const sigB64 = Buffer.from(new Uint8Array(sig)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifySessionToken(`${payloadB64}.${sigB64}`)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("not-a-valid-token")).toBeNull();
    expect(await verifySessionToken("a.b.c")).toBeNull();
  });

  it("rejects a forged token whose signature is not valid base64 instead of throwing", async () => {
    // Regression: an attacker-supplied cookie like "<payload>.fakesignature"
    // previously crashed verifySessionToken with an uncaught
    // InvalidCharacterError from atob() (base64UrlDecode was called outside
    // the try/catch), turning a forged cookie into a 500 instead of a 401.
    const payload = Buffer.from(JSON.stringify({ u: "hacker", exp: Math.floor(Date.now() / 1000) + 3600 }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySessionToken(`${payload}.fakesignature`)).toBeNull();
  });
});
