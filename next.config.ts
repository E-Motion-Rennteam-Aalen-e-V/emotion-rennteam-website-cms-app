import type { NextConfig } from "next";

// A strict, hash/nonce-based script-src isn't viable here without switching
// every page to dynamic rendering: Next.js injects its own per-page inline
// bootstrap script (RSC/hydration payload), which differs per page and per
// build, so it can't be allowlisted by a static hash, and nonces require
// forgoing static generation site-wide (per Next's own CSP docs). This site
// is almost entirely statically generated, so that trade isn't worth it for
// a defense-in-depth header — this follows Next's documented "Without
// Nonces" baseline CSP instead: https://nextjs.org/docs/app/guides/content-security-policy

// Next.js/Turbopack's dev server (React Fast Refresh, stack-trace
// symbolication) relies on eval(), so the dev-only CSP needs 'unsafe-eval'.
// Production never uses eval() (see Next's CSP docs) and stays without it.
const isDev = process.env.NODE_ENV !== "production";

// Only relax the CSP for Cloudflare Turnstile (see TurnstileWidget.tsx /
// src/lib/turnstile.ts) when a deployment actually has it configured - most
// installs don't, and there's no reason to allow-list a third-party origin
// nothing on the page ever loads.
const turnstileEnabled = Boolean(process.env.TURNSTILE_SECRET_KEY);

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${
    turnstileEnabled ? " https://challenges.cloudflare.com" : ""
  }`,
  // React/framer-motion set inline `style` attributes at render time, so
  // style-src needs 'unsafe-inline' too. CSS injection is a much
  // lower-severity risk than script injection.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${turnstileEnabled ? " https://challenges.cloudflare.com" : ""}`,
  "object-src 'none'",
  `frame-ancestors 'none'`,
  ...(turnstileEnabled ? [`frame-src https://challenges.cloudflare.com`] : []),
  "base-uri 'self'",
  "form-action 'self'",
  // Rewrites every http:// subresource/navigation on the page to https://.
  // This CMS is self-hosted and runs `next dev` directly over plain HTTP on
  // localhost (no TLS terminator in front of it) - forcing https there
  // breaks the page outright (JS bundles fail to load, so React never
  // hydrates). Production deployments normally sit behind a reverse proxy
  // that already terminates TLS, so this only matters for `next start`
  // without one; omit it entirely in dev.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Tells the BROWSER to remember, for up to 2 years, to force https for
  // this exact host on every future visit - including plain "localhost".
  // This CMS runs as a long-lived `next dev` process talked to directly
  // over HTTP; sending this header even once poisons the browser into
  // refusing http://localhost for the next two years (every asset request
  // silently upgrades to https, which nothing here serves, so the page
  // never loads again until the browser's HSTS cache for the host is
  // manually cleared). Only ever send it in a real production deployment.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  { key: "Content-Security-Policy", value: csp },
  // Isolates the browsing context so other origins can't hold a reference
  // to this page's window (blocks some cross-origin timing/spectre-style
  // attacks) without affecting same-origin navigation or the CMS/API.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Nothing here needs to be embedded by or fetched from another origin.
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Playwright (and some other local tooling) talks to the dev server via
  // 127.0.0.1 rather than localhost; without this, Next.js blocks its own
  // HMR websocket for that origin, which then forces periodic full-page
  // reloads that raced with e2e test interactions (a form submit clicked
  // right as the page reloaded fell back to a plain native GET instead of
  // being intercepted by React). Dev-only — production serves no HMR socket.
  ...(isDev ? { allowedDevOrigins: ["127.0.0.1"] } : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    // Uploaded photos are immutable-cached at the edge for a year (see the
    // /uploads header rule below); let the image-optimizer cache its
    // resized/re-encoded variants just as long instead of the 60s default,
    // so repeat visits never re-run the optimizer for the same source+size.
    minimumCacheTTL: 31536000,
  },
  // Pulls in only the framer-motion submodules actually referenced per file
  // instead of the whole package, shrinking the client JS bundle shipped
  // for pages that only use a couple of its features (Reveal, Stagger, ...).
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Content photos under /uploads are content-addressed by filename
        // (a changed photo gets a new name), so it's safe to let browsers
        // and CDNs cache them for a long time instead of revalidating on
        // every visit.
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
