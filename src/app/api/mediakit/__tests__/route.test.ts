import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mediakit/route";
import * as formDelivery from "@/lib/formDelivery";

function postRequest(body: unknown, ip = `4.2.3.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest("http://localhost/api/mediakit", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  firstName: "Ada",
  lastName: "Lovelace",
  company: "Presse GmbH",
  email: "ada@example.com",
  details: "Bitte Fahrzeugfotos in hoher Auflösung.",
  consent: "true",
  category_vehicle: true,
};

describe("POST /api/mediakit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid submission, joins categories, and delivers it", async () => {
    const deliverSpy = vi
      .spyOn(formDelivery, "deliverFormSubmission")
      .mockResolvedValue(undefined);

    const response = await POST(postRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(deliverSpy).toHaveBeenCalledWith(
      "mediakit",
      expect.objectContaining({ firstName: "Ada", categories: "Fahrzeugfotos (Studio)" })
    );
  });

  it("rejects a submission missing the last name", async () => {
    const response = await POST(postRequest({ ...validPayload, lastName: "" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors.lastName).toBeDefined();
  });

  it("rejects malformed JSON bodies", async () => {
    const request = new NextRequest("http://localhost/api/mediakit", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "6.6.6.9" },
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
    const ip = `6.0.0.${Math.floor(Math.random() * 250)}`;

    let lastResponse;
    for (let i = 0; i < 6; i += 1) {
      lastResponse = await POST(postRequest(validPayload, ip));
    }

    expect(lastResponse?.status).toBe(429);
  });

  it("rejects requests from a foreign Origin", async () => {
    const request = new NextRequest("http://localhost/api/mediakit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "6.6.6.7",
        origin: "https://evil.example",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("rejects non-JSON content types", async () => {
    const request = new NextRequest("http://localhost/api/mediakit", {
      method: "POST",
      headers: { "content-type": "text/plain", "x-forwarded-for": "6.6.6.6" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(415);
  });
});
