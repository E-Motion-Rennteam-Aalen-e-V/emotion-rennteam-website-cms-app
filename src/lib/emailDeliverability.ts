import { resolveMx } from "node:dns/promises";

/**
 * Optional server-side deliverability check for form email addresses (see
 * validation.ts for the syntax + disposable-domain checks that always run).
 * Off by default: a DNS lookup on every submission adds latency and an
 * external dependency (the resolver) to a path that otherwise has none.
 * Enable with ENABLE_EMAIL_MX_CHECK=true once typo'd addresses become a
 * real problem for a given deployment.
 */
export function isMxCheckEnabled(): boolean {
  return process.env.ENABLE_EMAIL_MX_CHECK === "true";
}

// Keeps a single slow/unresponsive resolver from hanging the request past
// the point where the round trip is worth it - a submission with a real,
// valid address should never be rejected just because DNS was slow.
const MX_LOOKUP_TIMEOUT_MS = 3000;

/**
 * Returns `true` when the address's domain has at least one MX record (or
 * the check is skipped/inconclusive - DNS failures fail open rather than
 * rejecting a possibly-genuine sender). Only meaningful for addresses that
 * already passed isValidEmail(); callers should validate syntax first.
 */
export async function hasDeliverableDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("MX lookup timed out")), MX_LOOKUP_TIMEOUT_MS)
      ),
    ]);
    return records.length > 0;
  } catch (err) {
    // ENOTFOUND/ENODATA are the resolver's definitive answer that the
    // domain exists but has no mail exchanger - a genuinely undeliverable
    // address, not a lookup failure. Anything else (timeout, SERVFAIL,
    // resolver unreachable) is inconclusive and fails open: our own DNS
    // trouble must never block a possibly-genuine sender.
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") return false;
    return true;
  }
}
