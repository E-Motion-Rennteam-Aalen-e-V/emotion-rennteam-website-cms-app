import { describe, expect, it, vi } from "vitest";
import { extensionForMimeType, isValidSlug, saveUploadedImage, slugify } from "@/lib/cms/content";

vi.mock("node:fs", () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
  return { promises, default: { promises } };
});

describe("slugify", () => {
  it("lowercases and dashes separators", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Rückflügel Prüfung")).toBe("ruckflugel-prufung");
  });

  it("collapses repeated separators and trims leading/trailing dashes", () => {
    expect(slugify("  --Foo__Bar--  ")).toBe("foo-bar");
  });

  it("falls back to a default when nothing alphanumeric remains", () => {
    expect(slugify("!!!")).toBe("eintrag");
    expect(slugify("")).toBe("eintrag");
  });

  it("truncates very long input", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });

  it("always produces output that isValidSlug accepts", () => {
    const inputs = ["Hello World!", "../../etc/passwd", "café münchen", "  ", "a/b/c", "ERT-12/24"];
    for (const input of inputs) {
      expect(isValidSlug(slugify(input))).toBe(true);
    }
  });
});

describe("extensionForMimeType", () => {
  it("maps allowed image MIME types to their fixed extension", () => {
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
    expect(extensionForMimeType("image/png")).toBe(".png");
    expect(extensionForMimeType("image/webp")).toBe(".webp");
    expect(extensionForMimeType("image/gif")).toBe(".gif");
  });

  it("rejects SVG and any other MIME type", () => {
    expect(extensionForMimeType("image/svg+xml")).toBeNull();
    expect(extensionForMimeType("text/html")).toBeNull();
    expect(extensionForMimeType("application/javascript")).toBeNull();
    expect(extensionForMimeType("")).toBeNull();
  });
});

describe("saveUploadedImage", () => {
  it("derives the written extension from the MIME type, never from the client-supplied filename", async () => {
    // Regression test: a malicious multipart request can set an arbitrary
    // Content-Type on the file field independent of the filename. Before the
    // fix, the extension was taken from `fileName` (path.extname), so a file
    // named "evil.html" declared as image/png would still be written to
    // public/uploads/ with a .html extension and be served as a live HTML
    // document from the site's own origin.
    const result = await saveUploadedImage("evil.html", "image/png", new Uint8Array([1, 2, 3]), "tester");
    expect(result.publicPath).toMatch(/\.png$/);
    expect(result.publicPath).not.toMatch(/\.html$/);
  });

  it("rejects a MIME type outside the allowlist (e.g. SVG) instead of writing a file", async () => {
    await expect(
      saveUploadedImage("evil.svg", "image/svg+xml", new Uint8Array([1, 2, 3]), "tester")
    ).rejects.toThrow();
  });
});

describe("isValidSlug", () => {
  it("accepts simple slugs", () => {
    expect(isValidSlug("aerodynamik")).toBe(true);
    expect(isValidSlug("aerodynamik-2")).toBe(true);
    expect(isValidSlug("ert-12-24")).toBe(true);
  });

  it("rejects path traversal attempts", () => {
    expect(isValidSlug("../../../etc/passwd")).toBe(false);
    expect(isValidSlug("..")).toBe(false);
    expect(isValidSlug("a/b")).toBe(false);
    expect(isValidSlug("a\\b")).toBe(false);
  });

  it("rejects empty, uppercase, and malformed slugs", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("Aerodynamik")).toBe(false);
    expect(isValidSlug("-leading-dash")).toBe(false);
    expect(isValidSlug("trailing-dash-")).toBe(false);
    expect(isValidSlug("double--dash")).toBe(false);
    expect(isValidSlug("has space")).toBe(false);
    expect(isValidSlug("has.dot")).toBe(false);
  });
});
