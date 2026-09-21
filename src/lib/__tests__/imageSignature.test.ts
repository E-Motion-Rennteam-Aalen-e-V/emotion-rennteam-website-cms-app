import { describe, expect, it } from "vitest";
import { matchesImageSignature } from "@/lib/imageSignature";

describe("matchesImageSignature", () => {
  it("accepts a genuine JPEG signature", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(matchesImageSignature(bytes, "image/jpeg")).toBe(true);
  });

  it("accepts a genuine PNG signature", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(matchesImageSignature(bytes, "image/png")).toBe(true);
  });

  it("accepts a genuine GIF signature", () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(matchesImageSignature(bytes, "image/gif")).toBe(true);
  });

  it("accepts a genuine WebP signature", () => {
    // RIFF <size> WEBP
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(matchesImageSignature(bytes, "image/webp")).toBe(true);
  });

  it("rejects a file whose bytes don't match the declared MIME type", () => {
    // A plain-text/HTML payload claiming to be a PNG.
    const bytes = new TextEncoder().encode("<script>alert(1)</script>");
    expect(matchesImageSignature(bytes, "image/png")).toBe(false);
  });

  it("rejects mismatched signatures across image types", () => {
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(matchesImageSignature(jpegBytes, "image/png")).toBe(false);
    expect(matchesImageSignature(jpegBytes, "image/gif")).toBe(false);
    expect(matchesImageSignature(jpegBytes, "image/webp")).toBe(false);
  });

  it("rejects unknown or unsupported MIME types", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    expect(matchesImageSignature(bytes, "image/svg+xml")).toBe(false);
    expect(matchesImageSignature(bytes, "application/octet-stream")).toBe(false);
  });

  it("rejects truncated/too-short byte arrays", () => {
    expect(matchesImageSignature(new Uint8Array([0xff, 0xd8]), "image/jpeg")).toBe(false);
    expect(matchesImageSignature(new Uint8Array([]), "image/png")).toBe(false);
  });
});
