import { describe, expect, it } from "vitest";
import {
  getBlogPostBySlug,
  getBlogPosts,
  getGallery,
  getNews,
  getNewsBySlug,
  getPage,
  getPositions,
  getResults,
  getSponsors,
  getTeam,
  getVehicles,
} from "@/lib/content";

// These tests read the real markdown content under content/, exercising the
// same fs + gray-matter code path the site uses at build time.

function isSortedDescending(values: number[]): boolean {
  return values.every((value, i) => i === 0 || values[i - 1] >= value);
}

function hasUniqueSlugs(items: { slug: string }[]): boolean {
  return new Set(items.map((item) => item.slug)).size === items.length;
}

describe("getTeam", () => {
  it("sorts members by their order field, undefined order last", () => {
    const team = getTeam();
    expect(team.length).toBeGreaterThan(0);
    const orders = team.map((member) => member.order ?? 99);
    expect(isSortedDescending(orders.map((o) => -o))).toBe(true);
  });

  it("gives every member a unique slug and a name", () => {
    const team = getTeam();
    expect(hasUniqueSlugs(team)).toBe(true);
    for (const member of team) {
      expect(member.slug).toBeTruthy();
      expect(member.name).toBeTruthy();
    }
  });
});

describe("getVehicles", () => {
  it("sorts vehicles newest year first", () => {
    const vehicles = getVehicles();
    expect(vehicles.length).toBeGreaterThan(0);
    expect(isSortedDescending(vehicles.map((v) => v.year))).toBe(true);
  });
});

describe("getSponsors", () => {
  const TIER_ORDER = ["Platin", "Gold", "Silber", "Partner"];

  it("only uses the documented tier values", () => {
    for (const sponsor of getSponsors()) {
      expect(TIER_ORDER).toContain(sponsor.tier);
    }
  });

  it("groups sponsors by tier in Platin > Gold > Silber > Partner order", () => {
    const tierIndices = getSponsors().map((s) => TIER_ORDER.indexOf(s.tier));
    expect(isSortedDescending(tierIndices.map((i) => -i))).toBe(true);
  });
});

describe("getNews / getNewsBySlug", () => {
  it("sorts posts newest first", () => {
    const news = getNews();
    expect(news.length).toBeGreaterThan(0);
    const timestamps = news.map((post) => new Date(post.date).getTime());
    expect(isSortedDescending(timestamps)).toBe(true);
  });

  it("looks posts up by slug and returns undefined for unknown slugs", () => {
    const [first] = getNews();
    expect(getNewsBySlug(first.slug)).toEqual(first);
    expect(getNewsBySlug("does-not-exist")).toBeUndefined();
  });

  it("derives the slug from the markdown filename, not the raw file extension", () => {
    for (const post of getNews()) {
      expect(post.slug).not.toMatch(/\.md$/);
      expect(post.slug.length).toBeGreaterThan(0);
    }
  });
});

describe("getBlogPosts / getBlogPostBySlug", () => {
  it("sorts posts newest first", () => {
    const posts = getBlogPosts();
    expect(posts.length).toBeGreaterThan(0);
    const timestamps = posts.map((post) => new Date(post.date).getTime());
    expect(isSortedDescending(timestamps)).toBe(true);
  });

  it("looks posts up by slug and returns undefined for unknown slugs", () => {
    const [first] = getBlogPosts();
    expect(getBlogPostBySlug(first.slug)).toEqual(first);
    expect(getBlogPostBySlug("does-not-exist")).toBeUndefined();
  });
});

describe("getPage", () => {
  it("returns known pages and undefined for unknown slugs", () => {
    expect(getPage("home")).toBeDefined();
    expect(getPage("does-not-exist")).toBeUndefined();
  });
});

describe("getResults", () => {
  it("sorts results newest year first", () => {
    const results = getResults();
    expect(results.length).toBeGreaterThan(0);
    expect(isSortedDescending(results.map((r) => r.year))).toBe(true);
  });
});

describe("getGallery", () => {
  it("has unique slugs across curated and auto-discovered images", () => {
    expect(hasUniqueSlugs(getGallery())).toBe(true);
  });

  it("gives every image a slug and an image path", () => {
    for (const image of getGallery()) {
      expect(image.slug).toBeTruthy();
      expect(image.image).toBeTruthy();
    }
  });
});

describe("getPositions", () => {
  it("returns an array of open positions", () => {
    expect(Array.isArray(getPositions())).toBe(true);
  });
});
