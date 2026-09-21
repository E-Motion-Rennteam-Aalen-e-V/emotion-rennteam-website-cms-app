/**
 * Central site-wide constants used for SEO metadata (Open Graph, canonical
 * URLs, sitemap.xml, robots.txt, JSON-LD structured data).
 *
 * The production domain isn't hard-coded anywhere else in the repo, so it's
 * read from NEXT_PUBLIC_SITE_URL with a best-guess fallback derived from the
 * team's contact e-mail domain (emotion-rennteam.de). If the real production
 * domain differs, set NEXT_PUBLIC_SITE_URL in the deployment environment.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://emotion-rennteam.de"
).replace(/\/$/, "");

export const SITE_NAME = "E-Motion Rennteam Aalen";

export const SITE_DESCRIPTION =
  "E-Motion Rennteam Aalen – das Formula-Student-Electric-Team der Hochschule Aalen. Team, Fahrzeuge, Sponsoren und News.";
