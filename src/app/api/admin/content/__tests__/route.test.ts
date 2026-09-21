import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cms/content", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cms/content")>("@/lib/cms/content");
  return {
    ...actual,
    listItems: vi.fn().mockResolvedValue([{ slug: "aerodynamik", data: { name: "Max" }, body: "" }]),
    getItem: vi.fn().mockResolvedValue({ slug: "aerodynamik", data: { name: "Max" }, body: "" }),
  };
});

import { GET as listGET, POST as listPOST } from "@/app/api/admin/content/[collection]/route";
import {
  GET as itemGET,
  PUT as itemPUT,
  DELETE as itemDELETE,
} from "@/app/api/admin/content/[collection]/[slug]/route";
import { createSessionToken, SESSION_COOKIE } from "@/lib/cms/auth";

async function authedRequest(url: string) {
  const token = await createSessionToken("admin");
  return new NextRequest(url, { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
}

describe("GET /api/admin/content/[collection]", () => {
  beforeEach(() => {
    process.env.CMS_SESSION_SECRET = "test-secret-at-least-16-chars-long";
  });

  it("rejects unauthenticated requests with 401", async () => {
    const request = new NextRequest("http://localhost/api/admin/content/team");
    const response = await listGET(request, { params: Promise.resolve({ collection: "team" }) });
    expect(response.status).toBe(401);
  });

  it("rejects a tampered session cookie with 401", async () => {
    const request = new NextRequest("http://localhost/api/admin/content/team", {
      headers: { cookie: `${SESSION_COOKIE}=not-a-valid-token` },
    });
    const response = await listGET(request, { params: Promise.resolve({ collection: "team" }) });
    expect(response.status).toBe(401);
  });

  it("returns the collection's items for an authenticated request", async () => {
    const request = await authedRequest("http://localhost/api/admin/content/team");
    const response = await listGET(request, { params: Promise.resolve({ collection: "team" }) });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.items).toHaveLength(1);
    expect(json.collection.name).toBe("team");
  });

  it("404s for an unknown collection even when authenticated", async () => {
    const request = await authedRequest("http://localhost/api/admin/content/nope");
    const response = await listGET(request, { params: Promise.resolve({ collection: "nope" }) });
    expect(response.status).toBe(404);
  });
});

describe("POST /api/admin/content/[collection]", () => {
  beforeEach(() => {
    process.env.CMS_SESSION_SECRET = "test-secret-at-least-16-chars-long";
  });

  it("rejects unauthenticated requests with 401 (auth before collection check)", async () => {
    const request = new NextRequest("http://localhost/api/admin/content/nope", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await listPOST(request, { params: Promise.resolve({ collection: "nope" }) });
    expect(response.status).toBe(401);
  });
});

describe("PUT /api/admin/content/[collection]/[slug]", () => {
  beforeEach(() => {
    process.env.CMS_SESSION_SECRET = "test-secret-at-least-16-chars-long";
  });

  it("rejects unauthenticated requests with 401 (auth before collection check)", async () => {
    const request = new NextRequest("http://localhost/api/admin/content/nope/slug", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await itemPUT(request, { params: Promise.resolve({ collection: "nope", slug: "slug" }) });
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/admin/content/[collection]/[slug]", () => {
  beforeEach(() => {
    process.env.CMS_SESSION_SECRET = "test-secret-at-least-16-chars-long";
  });

  it("rejects unauthenticated requests with 401 (auth before collection check)", async () => {
    const request = new NextRequest("http://localhost/api/admin/content/nope/slug", {
      method: "DELETE",
    });
    const response = await itemDELETE(request, { params: Promise.resolve({ collection: "nope", slug: "slug" }) });
    expect(response.status).toBe(401);
  });
});

describe("GET /api/admin/content/[collection]/[slug]", () => {
  beforeEach(() => {
    process.env.CMS_SESSION_SECRET = "test-secret-at-least-16-chars-long";
  });

  it("rejects unauthenticated requests with 401", async () => {
    const request = new NextRequest("http://localhost/api/admin/content/team/aerodynamik");
    const response = await itemGET(request, {
      params: Promise.resolve({ collection: "team", slug: "aerodynamik" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns the item for an authenticated request", async () => {
    const request = await authedRequest("http://localhost/api/admin/content/team/aerodynamik");
    const response = await itemGET(request, {
      params: Promise.resolve({ collection: "team", slug: "aerodynamik" }),
    });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.item.slug).toBe("aerodynamik");
  });
});
