/**
 * Optional Cloudflare Turnstile verification, on top of the existing
 * honeypot + timing-trap bot check (see isBotSubmission in validation.ts).
 * Off by default: only meaningful once TURNSTILE_SECRET_KEY (server) and
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY (client, read by TurnstileWidget.tsx) are
 * both configured for a deployment seeing spam the existing checks miss.
 */
const VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verifies a token from the client-side widget's "cf-turnstile-response"
 * field (rendered by TurnstileWidget.tsx). Fails closed on a missing token
 * (nothing to verify) but open on a verification-request error (network
 * issue, Cloudflare outage) - a real client-side widget failure should not
 * be indistinguishable from a bot skipping it, so this only protects
 * against Cloudflare being unreachable, not against tampering.
 */
export async function verifyTurnstileToken(token: string, remoteIp: string): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not enabled - callers should check isTurnstileEnabled() first.

  try {
    const response = await fetch(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
    });
    if (!response.ok) return true;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (err) {
    console.error("Turnstile: Verifikationsanfrage fehlgeschlagen:", err);
    return true;
  }
}
