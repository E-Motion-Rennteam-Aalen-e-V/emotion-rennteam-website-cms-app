import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import { DELETE, GET } from "@/app/api/admin/media/route";
import * as auth from "@/lib/cms/auth";
import * as github from "@/lib/cms/github";
import * as media from "@/lib/cms/media";

function getRequest() {
  return new NextRequest("http://localhost/api/admin/media");
}

function deleteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/media", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sessionUser = { username: "admin", mustChangePassword: false, roles: [] };
const adminSessionUser = { username: "admin", mustChangePassword: false, roles: ["Admin"] };

describe("GET /api/admin/media", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when not authenticated", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
  });

  it("returns the list of uploaded files", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);
    const files = [{ name: "a.png", path: "/uploads/a.png", size: 10, mtime: 1 }];
    vi.spyOn(media, "listUploadedImages").mockResolvedValue(files);

    const response = await GET(getRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.files).toEqual(files);
  });

  it("returns 500 when the uploads directory can't be read", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);
    vi.spyOn(media, "listUploadedImages").mockRejectedValue(new Error("boom"));

    const response = await GET(getRequest());

    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/admin/media", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects when not authenticated", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(null);

    const response = await DELETE(deleteRequest({ filename: "a.png" }));

    expect(response.status).toBe(401);
  });

  it("rejects when session has insufficient role", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(sessionUser);

    const response = await DELETE(deleteRequest({ filename: "a.png" }));

    expect(response.status).toBe(403);
  });

  it("rejects malformed JSON bodies", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(adminSessionUser);
    const request = new NextRequest("http://localhost/api/admin/media", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    const response = await DELETE(request);

    expect(response.status).toBe(400);
  });

  it("rejects a filename that resolves outside the uploads directory", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(adminSessionUser);
    vi.spyOn(media, "resolveUploadPath").mockReturnValue(null);

    const response = await DELETE(deleteRequest({ filename: "../../etc/passwd" }));

    expect(response.status).toBe(400);
  });

  it("returns 404 when the file doesn't exist", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(adminSessionUser);
    vi.spyOn(media, "resolveUploadPath").mockReturnValue("/tmp/uploads/missing.png");
    vi.spyOn(fs, "unlink").mockRejectedValue(new Error("ENOENT"));

    const response = await DELETE(deleteRequest({ filename: "missing.png" }));

    expect(response.status).toBe(404);
  });

  it("deletes locally and notes the missing GitHub config", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(adminSessionUser);
    vi.spyOn(media, "resolveUploadPath").mockReturnValue("/tmp/uploads/a.png");
    vi.spyOn(fs, "unlink").mockResolvedValue(undefined);
    vi.spyOn(github, "getGithubConfig").mockReturnValue(null);
    const deleteSpy = vi.spyOn(github, "deleteFile");

    const response = await DELETE(deleteRequest({ filename: "a.png" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.committedToGithub).toBe(false);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("deletes locally and commits the removal to GitHub", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(adminSessionUser);
    vi.spyOn(media, "resolveUploadPath").mockReturnValue("/tmp/uploads/a.png");
    vi.spyOn(fs, "unlink").mockResolvedValue(undefined);
    vi.spyOn(github, "getGithubConfig").mockReturnValue({
      owner: "o",
      repo: "r",
      branch: "main",
      token: "t",
    });
    const deleteSpy = vi.spyOn(github, "deleteFile").mockResolvedValue(undefined);

    const response = await DELETE(deleteRequest({ filename: "a.png" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.committedToGithub).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith("public/uploads/a.png", expect.any(String), "admin");
  });

  it("reports a warning when the local delete succeeds but the GitHub commit fails", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(adminSessionUser);
    vi.spyOn(media, "resolveUploadPath").mockReturnValue("/tmp/uploads/a.png");
    vi.spyOn(fs, "unlink").mockResolvedValue(undefined);
    vi.spyOn(github, "getGithubConfig").mockReturnValue({
      owner: "o",
      repo: "r",
      branch: "main",
      token: "t",
    });
    vi.spyOn(github, "deleteFile").mockRejectedValue(new Error("network error"));

    const response = await DELETE(deleteRequest({ filename: "a.png" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.committedToGithub).toBe(false);
    expect(json.warning).toMatch(/GitHub-Commit/);
  });
});
