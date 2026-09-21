// @vitest-environment node
//
// API routes run under the Node.js runtime in production; NextRequest's
// FormData parsing constructs File instances from Node's undici, which
// don't satisfy `instanceof File` against jsdom's own File class (the
// suite's default test environment). Force Node here so `file instanceof
// File` in the route under test behaves the same as it does in production.
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/upload/route";
import * as auth from "@/lib/cms/auth";
import * as content from "@/lib/cms/content";

function uploadRequest(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  return new NextRequest("http://localhost/api/admin/upload", {
    method: "POST",
    body: formData,
  });
}

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

describe("POST /api/admin/upload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when not authenticated", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(null);

    const file = new File([PNG_SIGNATURE], "photo.png", { type: "image/png" });
    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(401);
  });

  it("rejects a file whose content doesn't match its declared image type", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({ username: "admin", mustChangePassword: false, roles: [] });
    const saveSpy = vi.spyOn(content, "saveUploadedImage");

    // Plain text content, but claims to be a PNG - a spoofed Content-Type.
    const file = new File(["<script>alert(1)</script>"], "fake.png", { type: "image/png" });
    const response = await POST(uploadRequest(file));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/Datei-Inhalt/);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("accepts a genuine PNG and saves it", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({ username: "admin", mustChangePassword: false, roles: [] });
    vi.spyOn(content, "saveUploadedImage").mockResolvedValue({
      publicPath: "/uploads/photo.png",
      committedToGithub: false,
      commitUrl: null,
    });

    const file = new File([PNG_SIGNATURE], "photo.png", { type: "image/png" });
    const response = await POST(uploadRequest(file));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.publicPath).toBe("/uploads/photo.png");
  });

  it("rejects disallowed MIME types before signature checking", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({ username: "admin", mustChangePassword: false, roles: [] });

    const file = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(400);
  });
});
