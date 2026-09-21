import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("renders basic markdown to HTML", async () => {
    const html = await renderMarkdown("# Titel\n\nEin **wichtiger** Absatz.");
    expect(html).toContain("<h1>Titel</h1>");
    expect(html).toContain("<strong>wichtiger</strong>");
  });

  it("strips <script> tags embedded in markdown (stored XSS)", async () => {
    const html = await renderMarkdown('Hallo<script>alert("xss")</script>Welt');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert(");
  });

  it("strips inline event handler attributes", async () => {
    const html = await renderMarkdown('<img src="x.jpg" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("strips javascript: URLs from links", async () => {
    const html = await renderMarkdown("[click me](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("keeps ordinary links and adds rel=noopener", async () => {
    const html = await renderMarkdown("[E-Motion](https://emotion-rennteam.de)");
    expect(html).toContain('href="https://emotion-rennteam.de"');
    expect(html).toContain("noopener");
  });

  it("handles empty input without throwing", async () => {
    await expect(renderMarkdown("")).resolves.toBe("");
  });
});
