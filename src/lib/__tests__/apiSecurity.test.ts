import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { hasJsonContentType, isTrustedOrigin } from "@/lib/apiSecurity";

function request(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/contact", { method: "POST", headers });
}

describe("isTrustedOrigin", () => {
  it("allows requests with no Origin header", () => {
    expect(isTrustedOrigin(request({}))).toBe(true);
  });

  it("allows requests whose Origin matches the site", () => {
    expect(
      isTrustedOrigin(request({ origin: "https://emotion-rennteam.de" }))
    ).toBe(true);
  });

  it("rejects requests from a foreign Origin", () => {
    expect(isTrustedOrigin(request({ origin: "https://evil.example" }))).toBe(false);
  });

  it("rejects a malformed Origin header", () => {
    expect(isTrustedOrigin(request({ origin: "not-a-url" }))).toBe(false);
  });
});

describe("hasJsonContentType", () => {
  it("accepts application/json", () => {
    expect(hasJsonContentType(request({ "content-type": "application/json" }))).toBe(true);
  });

  it("accepts application/json with a charset suffix", () => {
    expect(
      hasJsonContentType(request({ "content-type": "application/json; charset=utf-8" }))
    ).toBe(true);
  });

  it("rejects other content types", () => {
    expect(hasJsonContentType(request({ "content-type": "text/plain" }))).toBe(false);
  });

  it("rejects a missing content type", () => {
    expect(hasJsonContentType(request({}))).toBe(false);
  });
});
