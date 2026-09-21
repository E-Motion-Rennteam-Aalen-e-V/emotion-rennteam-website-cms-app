import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/media/lookup/route";
import * as auth from "@/lib/cms/auth";
import * as media from "@/lib/cms/media";

function lookupRequest(name?: string) {
  const url = new URL("http://localhost/api/admin/media/lookup");
  if (name !== undefined) url.searchParams.set("name", name);
  return new NextRequest(url);
}

const sessionUser = { username: "admin", mustChangePassword: false, roles: [] };

describe("GET /api/admin/media/lookup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when not authenticated", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(null);

    const response = await GET(lookupRequest("Timo"));

    expect(response.status).toBe(401);
  });

  it("returns null when no name is given", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);

    const response = await GET(lookupRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.path).toBeNull();
  });

  it("matches a file by full name regardless of accents/casing/hyphens", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);
    vi.spyOn(media, "listUploadedImages").mockResolvedValue([
      { name: "single-bilder-upload/timo-m.jpg", path: "/uploads/single-bilder-upload/timo-m.jpg", size: 1, mtime: 1 },
    ]);

    const response = await GET(lookupRequest("Timo M."));
    const json = await response.json();

    expect(json.path).toBe("/uploads/single-bilder-upload/timo-m.jpg");
  });

  it("falls back to matching just the first word", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);
    vi.spyOn(media, "listUploadedImages").mockResolvedValue([
      { name: "team/anna.jpg", path: "/uploads/team/anna.jpg", size: 1, mtime: 1 },
    ]);

    const response = await GET(lookupRequest("Anna Schmidt"));
    const json = await response.json();

    expect(json.path).toBe("/uploads/team/anna.jpg");
  });

  it("picks the newest file when several match", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);
    vi.spyOn(media, "listUploadedImages").mockResolvedValue([
      { name: "old/anna.jpg", path: "/uploads/old/anna.jpg", size: 1, mtime: 1 },
      { name: "new/anna.jpg", path: "/uploads/new/anna.jpg", size: 1, mtime: 100 },
    ]);

    const response = await GET(lookupRequest("Anna"));
    const json = await response.json();

    expect(json.path).toBe("/uploads/new/anna.jpg");
  });

  it("returns null when nothing matches", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);
    vi.spyOn(media, "listUploadedImages").mockResolvedValue([
      { name: "team/anna.jpg", path: "/uploads/team/anna.jpg", size: 1, mtime: 1 },
    ]);

    const response = await GET(lookupRequest("Zoe"));
    const json = await response.json();

    expect(json.path).toBeNull();
  });
});
