import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/newsletter/route";
import * as formDelivery from "@/lib/formDelivery";

function postRequest(body: unknown, ip = `5.2.3.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest("http://localhost/api/newsletter", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/newsletter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid email and delivers it", async () => {
    const deliverSpy = vi
      .spyOn(formDelivery, "deliverFormSubmission")
      .mockResolvedValue(undefined);

    const response = await POST(postRequest({ email: "ada@example.com" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(deliverSpy).toHaveBeenCalledWith("newsletter", { email: "ada@example.com" });
  });

  it("rejects an invalid email address", async () => {
    const response = await POST(postRequest({ email: "not-an-email" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors.email).toBeDefined();
  });

  it("rejects malformed JSON bodies", async () => {
    const request = new NextRequest("http://localhost/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "5.5.5.9" },
      body: "not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("silently accepts but does not deliver honeypot-tripped submissions", async () => {
    const deliverSpy = vi
      .spyOn(formDelivery, "deliverFormSubmission")
      .mockResolvedValue(undefined);

    const response = await POST(
      postRequest({ email: "ada@example.com", website: "http://spam.example" })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(deliverSpy).not.toHaveBeenCalled();
  });

  it("rate-limits repeated submissions from the same IP", async () => {
    vi.spyOn(formDelivery, "deliverFormSubmission").mockResolvedValue(undefined);
    const ip = `5.0.0.${Math.floor(Math.random() * 250)}`;

    let lastResponse;
    for (let i = 0; i < 6; i += 1) {
      lastResponse = await POST(postRequest({ email: "ada@example.com" }, ip));
    }

    expect(lastResponse?.status).toBe(429);
  });

  // Regression: unlike the other four form endpoints (contact, mitmachen,
  // sponsoring, mediakit), this route was missing the isTrustedOrigin/
  // hasJsonContentType checks entirely, leaving it open to cross-site
  // submissions via the "enctype=text/plain" CSRF technique (a plain HTML
  // form can craft a body that parses as valid JSON without triggering a
  // CORS preflight, since no explicit application/json Content-Type check
  // was enforced).
  it("rejects requests from a foreign Origin", async () => {
    const request = new NextRequest("http://localhost/api/newsletter", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "7.7.7.7",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ email: "ada@example.com" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("rejects non-JSON content types", async () => {
    const request = new NextRequest("http://localhost/api/newsletter", {
      method: "POST",
      headers: { "content-type": "text/plain", "x-forwarded-for": "7.7.7.6" },
      body: JSON.stringify({ email: "ada@example.com" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(415);
  });
});
