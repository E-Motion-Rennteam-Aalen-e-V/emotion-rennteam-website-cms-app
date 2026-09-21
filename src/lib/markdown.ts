import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Renders trusted-but-not-fully-trusted Markdown (CMS-authored content) to
 * safe HTML. `marked` does not sanitize its output, and CMS content can
 * contain raw HTML (e.g. pasted `<script>` tags), so any parsed markdown
 * must be run through a sanitizer before it is used with
 * `dangerouslySetInnerHTML`.
 */
export async function renderMarkdown(source: string): Promise<string> {
  const rawHtml = await marked.parse(source || "");
  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "figure",
      "figcaption",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      a: ["href", "name", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
