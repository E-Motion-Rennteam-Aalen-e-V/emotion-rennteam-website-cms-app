import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commitBinaryFile, commitFile, deleteFile, getGithubConfig } from "@/lib/cms/github";

const ORIGINAL_ENV = { ...process.env };

function setGithubEnv() {
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_OWNER = "octo-owner";
  process.env.GITHUB_REPO = "octo-repo";
  process.env.GITHUB_BRANCH = "main";
}

function clearGithubEnv() {
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_OWNER;
  delete process.env.GITHUB_REPO;
  delete process.env.GITHUB_BRANCH;
}

describe("getGithubConfig", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns null when any required env var is missing", () => {
    clearGithubEnv();
    expect(getGithubConfig()).toBeNull();

    setGithubEnv();
    delete process.env.GITHUB_TOKEN;
    expect(getGithubConfig()).toBeNull();
  });

  it("defaults branch to main when GITHUB_BRANCH is unset", () => {
    setGithubEnv();
    delete process.env.GITHUB_BRANCH;
    expect(getGithubConfig()).toEqual({
      token: "test-token",
      owner: "octo-owner",
      repo: "octo-repo",
      branch: "main",
    });
  });

  it("returns the full config when all env vars are set", () => {
    setGithubEnv();
    process.env.GITHUB_BRANCH = "cms-content";
    expect(getGithubConfig()).toEqual({
      token: "test-token",
      owner: "octo-owner",
      repo: "octo-repo",
      branch: "cms-content",
    });
  });
});

describe("commitFile / commitBinaryFile / deleteFile", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setGithubEnv();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("throws immediately when GitHub is not configured, without calling fetch", async () => {
    clearGithubEnv();
    await expect(commitFile("content/team/foo.md", "hi", "msg", "Editor")).rejects.toThrow(
      /nicht konfiguriert/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up the existing file sha, then PUTs base64 content with it on update", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "abc123" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ commit: { html_url: "https://github.com/o/r/commit/1" } }), {
          status: 200,
        })
      );

    const result = await commitFile("content/team/foo.md", "hello", "cms: update", "Editor Name");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [shaUrl, shaOpts] = fetchMock.mock.calls[0];
    expect(shaUrl).toContain("/repos/octo-owner/octo-repo/contents/content/team/foo.md?ref=main");
    expect(shaOpts.headers.Authorization).toBe("Bearer test-token");

    const [putUrl, putOpts] = fetchMock.mock.calls[1];
    expect(putUrl).toContain("/repos/octo-owner/octo-repo/contents/content/team/foo.md");
    expect(putOpts.method).toBe("PUT");
    const putBody = JSON.parse(putOpts.body as string);
    expect(putBody.sha).toBe("abc123");
    expect(putBody.branch).toBe("main");
    expect(putBody.message).toBe("cms: update");
    expect(Buffer.from(putBody.content, "base64").toString("utf-8")).toBe("hello");
    expect(putBody.committer).toEqual({ name: "Editor Name", email: "editor-name@cms.local" });

    expect(result.commitUrl).toBe("https://github.com/o/r/commit/1");
  });

  it("omits sha (creates new file) when the file does not yet exist (404)", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ commit: { html_url: "https://github.com/o/r/commit/2" } }), {
          status: 200,
        })
      );

    await commitFile("content/team/new.md", "hello", "cms: create", "Editor");

    const putBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(putBody.sha).toBeUndefined();
  });

  it("throws with response status and body when the sha lookup fails for a non-404 reason", async () => {
    fetchMock.mockResolvedValueOnce(new Response("server error", { status: 500 }));
    await expect(commitFile("content/team/foo.md", "hello", "msg", "Editor")).rejects.toThrow(/500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws with response status and body when the PUT commit fails", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(new Response("bad request details", { status: 422 }));

    await expect(commitFile("content/team/foo.md", "hello", "msg", "Editor")).rejects.toThrow(/422/);
  });

  it("commitBinaryFile base64-encodes raw bytes as-is", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ commit: { html_url: "https://github.com/o/r/commit/3" } }), {
          status: 200,
        })
      );

    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    await commitBinaryFile("public/uploads/x.png", bytes, "cms: upload", "Editor");

    const putBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(Buffer.from(putBody.content, "base64")).toEqual(Buffer.from(bytes));
  });

  it("deleteFile no-ops when the file does not exist on GitHub", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));
    await deleteFile("content/team/gone.md", "cms: delete", "Editor");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deleteFile sends the DELETE request with the looked-up sha", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "deadbeef" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    await deleteFile("content/team/gone.md", "cms: delete", "Editor");

    const [, delOpts] = fetchMock.mock.calls[1];
    expect(delOpts.method).toBe("DELETE");
    const delBody = JSON.parse(delOpts.body as string);
    expect(delBody.sha).toBe("deadbeef");
  });

  it("throws when the DELETE request fails", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "deadbeef" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("nope", { status: 403 }));

    await expect(deleteFile("content/team/gone.md", "cms: delete", "Editor")).rejects.toThrow(/403/);
  });
});
