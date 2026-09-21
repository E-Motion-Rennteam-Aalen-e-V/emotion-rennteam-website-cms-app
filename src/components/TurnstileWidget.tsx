import Script from "next/script";

/**
 * Renders nothing unless a Cloudflare Turnstile site key is configured
 * (see src/lib/turnstile.ts for the matching optional server-side
 * verification). When configured, Cloudflare's script finds this div via
 * its "cf-turnstile" class (implicit rendering: no extra client JS needed
 * here) and injects the widget plus a hidden `cf-turnstile-response` input
 * as a sibling inside it - since every form on this site builds its submit
 * payload via `new FormData(formElement)`, that field is picked up
 * automatically as long as this component renders inside the <form>.
 */
export default function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />
    </>
  );
}
