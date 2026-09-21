import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/sponsoring/route";
import * as formDelivery from "@/lib/formDelivery";

function postRequest(body: unknown, ip = `2.2.3.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest("http://localhost/api/sponsoring", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  company: "Acme GmbH",
  contact: "Ada Lovelace",
  email: "ada@example.com",
  phone: "",
  tier: "Gold",
  message: "Wir würden gerne sponsern.",
  consent: "true",
};

describe("POST /api/sponsoring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid submission and delivers it", async () => {
    const deliverSpy = vi
      .spyOn(formDelivery, "deliverFormSubmission")
      .mockResolvedValue(undefined);

    const response = await POST(postRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(deliverSpy).toHaveBeenCalledWith("sponsoring", expect.objectContaining({ company: "Acme GmbH" }));
  });

  it("rejects an invalid submission with field errors", async () => {
    const response = await POST(postRequest({ ...validPayload, email: "not-an-email" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.errors.email).toBeDefined();
  });

  it("rejects an unknown sponsoring tier", async () => {
    const response = await POST(postRequest({ ...validPayload, tier: "Diamant" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors.tier).toBeDefined();
  });

  it("rejects malformed JSON bodies", async () => {
    const request = new NextRequest("http://localhost/api/sponsoring", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "8.8.8.9" },
      body: "not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("silently accepts but does not deliver honeypot-tripped submissions", async () => {
    const deliverSpy = vi
      .spyOn(formDelivery, "deliverFormSubmission")
      .mockResolvedValue(undefined);

    const response = await POST(postRequest({ ...validPayload, website: "http://spam.example" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(deliverSpy).not.toHaveBeenCalled();
  });

  it("rate-limits repeated submissions from the same IP", async () => {
    vi.spyOn(formDelivery, "deliverFormSubmission").mockResolvedValue(undefined);
    const ip = `8.0.0.${Math.floor(Math.random() * 250)}`;

    let lastResponse;
    for (let i = 0; i < 6; i += 1) {
      lastResponse = await POST(postRequest(validPayload, ip));
    }

    expect(lastResponse?.status).toBe(429);
  });

  it("rejects requests from a foreign Origin", async () => {
    const request = new NextRequest("http://localhost/api/sponsoring", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "8.8.8.7",
        origin: "https://evil.example",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("rejects non-JSON content types", async () => {
    const request = new NextRequest("http://localhost/api/sponsoring", {
      method: "POST",
      headers: { "content-type": "text/plain", "x-forwarded-for": "8.8.8.6" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(415);
  });
});
