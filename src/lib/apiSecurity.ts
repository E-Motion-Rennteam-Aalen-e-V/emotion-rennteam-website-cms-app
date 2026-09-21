import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/site";

/**
 * Lightweight CSRF defense for the site's cookie-less JSON form endpoints
 * (OWASP "Verifying Origin with Standard Headers"): a cross-site page can
 * still trigger a POST to these routes, but browsers attach `Origin` (and
 * `Sec-Fetch-Site`) to same-site fetches, which a forged cross-origin
 * request cannot spoof. Requests carrying an Origin that doesn't match the
 * site's own origin are rejected outright; requests with no Origin at all
 * (some non-browser clients) are allowed through since there's nothing to
 * check — the rate limiter and validation layer still apply to those.
 */
export function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(SITE_URL).origin;
  } catch {
    return false;
  }
}

/** Rejects anything that isn't declaring a JSON body, before it's parsed. */
export function hasJsonContentType(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().includes("application/json");
}
