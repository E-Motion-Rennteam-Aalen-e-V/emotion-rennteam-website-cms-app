import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appendFileSyncMock = vi.hoisted(() => vi.fn());
vi.mock("node:fs", () => ({
  appendFileSync: appendFileSyncMock,
  default: { appendFileSync: appendFileSyncMock },
}));

import { deliverFormSubmission } from "@/lib/formDelivery";

describe("deliverFormSubmission", () => {
  const originalWebhookUrl = process.env.FORM_WEBHOOK_URL;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    appendFileSyncMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalWebhookUrl === undefined) delete process.env.FORM_WEBHOOK_URL;
    else process.env.FORM_WEBHOOK_URL = originalWebhookUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("persists to the local fallback file and logs loudly when FORM_WEBHOOK_URL is unset", async () => {
    delete process.env.FORM_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await deliverFormSubmission("contact", { name: "Ada", email: "ada@example.com" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[form:contact] ACTION REQUIRED: FORM_WEBHOOK_URL is not configured")
    );
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
    const [, contents] = appendFileSyncMock.mock.calls[0];
    const written = JSON.parse(contents as string);
    expect(written).toMatchObject({
      form: "contact",
      data: { name: "Ada", email: "ada@example.com" },
      reason: "no_webhook_configured",
    });
  });

  it("POSTs the submission as JSON when FORM_WEBHOOK_URL is configured", async () => {
    process.env.FORM_WEBHOOK_URL = "https://hooks.example.com/incoming";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await deliverFormSubmission("sponsoring", { email: "team@example.com" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example.com/incoming");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init.body);
    expect(body.form).toBe("sponsoring");
    expect(body.data).toEqual({ email: "team@example.com" });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(appendFileSyncMock).not.toHaveBeenCalled();
  });

  it("logs an error and persists to the fallback file when the webhook responds with a non-2xx status", async () => {
    process.env.FORM_WEBHOOK_URL = "https://hooks.example.com/incoming";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(
      deliverFormSubmission("sponsoring", { company: "Acme" })
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[form:sponsoring] webhook delivery failed with status 500"
    );
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
    const written = JSON.parse(appendFileSyncMock.mock.calls[0][1] as string);
    expect(written.reason).toBe("webhook_status_500");
  });

  it("logs an error and persists to the fallback file when the webhook request aborts or times out", async () => {
    process.env.FORM_WEBHOOK_URL = "https://hooks.example.com/incoming";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "TimeoutError"))
    );

    await expect(
      deliverFormSubmission("mitmachen", { name: "Ada" })
    ).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[form:mitmachen] webhook delivery threw",
      expect.any(DOMException)
    );
    expect(appendFileSyncMock).toHaveBeenCalledTimes(1);
    const written = JSON.parse(appendFileSyncMock.mock.calls[0][1] as string);
    expect(written.reason).toBe("webhook_threw");
  });

  it("passes an AbortSignal that fires well before typical serverless function timeouts", async () => {
    process.env.FORM_WEBHOOK_URL = "https://hooks.example.com/incoming";
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal;
        return Promise.resolve({ ok: true, status: 200 });
      })
    );

    await deliverFormSubmission("contact", { name: "Ada" });

    expect(capturedSignal?.aborted).toBe(false);
  });
});
