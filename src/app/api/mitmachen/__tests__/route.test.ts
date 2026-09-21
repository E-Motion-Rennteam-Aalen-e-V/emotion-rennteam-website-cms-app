import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mitmachen/route";
import * as formDelivery from "@/lib/formDelivery";

function postRequest(body: unknown, ip = `3.2.3.${Math.floor(Math.random() * 250)}`) {
  return new NextRequest("http://localhost/api/mitmachen", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "",
  department: "Electrics",
  message: "Ich möchte gerne mitmachen.",
  consent: "true",
  skill_cad: true,
};

describe("POST /api/mitmachen", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid submission, joins skills, and delivers it", async () => {
    const deliverSpy = vi
      .spyOn(formDelivery, "deliverFormSubmission")
      .mockResolvedValue(undefined);

    const response = await POST(postRequest(validPayload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(deliverSpy).toHaveBeenCalledWith(
      "mitmachen",
      expect.objectContaining({ name: "Ada Lovelace", skills: "CAD Kenntnisse" })
    );
  });

  it("rejects an unknown department", async () => {
    const response = await POST(postRequest({ ...validPayload, department: "Nicht existent" }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.errors.department).toBeDefined();
  });

  it("rejects malformed JSON bodies", async () => {
    const request = new NextRequest("http://localhost/api/mitmachen", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "7.7.7.9" },
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
    const ip = `7.0.0.${Math.floor(Math.random() * 250)}`;

    let lastResponse;
    for (let i = 0; i < 6; i += 1) {
      lastResponse = await POST(postRequest(validPayload, ip));
    }

    expect(lastResponse?.status).toBe(429);
  });

  it("rejects requests from a foreign Origin", async () => {
    const request = new NextRequest("http://localhost/api/mitmachen", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "7.7.7.7",
        origin: "https://evil.example",
      },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("rejects non-JSON content types", async () => {
    const request = new NextRequest("http://localhost/api/mitmachen", {
      method: "POST",
      headers: { "content-type": "text/plain", "x-forwarded-for": "7.7.7.6" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(415);
  });
});
