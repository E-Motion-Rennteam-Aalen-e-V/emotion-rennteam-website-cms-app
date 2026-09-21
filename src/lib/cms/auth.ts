// Session handling for the custom CMS admin. Uses a signed, expiring cookie
// (HMAC-SHA256 over a JSON payload) rather than a library, verified with Web
// Crypto so it also works from the edge-runtime middleware.

export const SESSION_COOKIE = "cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

interface SessionPayload {
  u: string;
  exp: number;
  /** Muss vor weiterer Nutzung erst ein eigenes Passwort vergeben. */
  p?: boolean;
  /** Rollen aus dem Credentials-Repo (z.B. "Admin", "Sponsoring-Management"). Leer/fehlend für lokale/Bootstrap-Nutzer. */
  r?: string[];
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(str.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function getSecret(): string {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "CMS_SESSION_SECRET ist nicht gesetzt (oder zu kurz). Bitte einen zufälligen String mit mindestens 16 Zeichen in .env.local eintragen."
    );
  }
  return secret;
}

export async function createSessionToken(
  username: string,
  mustChangePassword = false,
  roles: string[] = []
): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    ...(mustChangePassword ? { p: true } : {}),
    ...(roles.length > 0 ? { r: roles } : {}),
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = base64UrlEncode(payloadBytes);
  const key = await hmacKey(getSecret());
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ username: string; mustChangePassword: boolean; roles: string[] } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const key = await hmacKey(secret);
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  let providedSig: Uint8Array;
  try {
    providedSig = base64UrlDecode(sigB64);
  } catch {
    return null;
  }
  const expected = new Uint8Array(expectedSig);
  if (expected.length !== providedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ providedSig[i];
  if (diff !== 0) return null;

  if (revokedSigs.has(sigB64)) return null;

  try {
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.u !== "string" || !payload.u) return null;
    return {
      username: payload.u,
      mustChangePassword: payload.p === true,
      roles: Array.isArray(payload.r) ? payload.r.filter((r): r is string => typeof r === "string") : [],
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

// In-memory set of revoked token signatures. Entries are tagged with their
// expiry so they can be swept on each revocation, keeping memory bounded.
// Note: only valid within a single process — a serverless cold-start or a
// second instance won't see these. Configure Upstash (UPSTASH_REDIS_REST_URL
// + UPSTASH_REDIS_REST_TOKEN) if cross-instance invalidation is required.
const revokedSigs = new Map<string, number>(); // sig → exp (unix seconds)

function sweepRevokedSigs(now: number): void {
  for (const [sig, exp] of revokedSigs) {
    if (exp <= now) revokedSigs.delete(sig);
  }
}

/** Revoke a session token so it is rejected by verifySessionToken. */
export function revokeSessionToken(token: string): void {
  const parts = token.split(".");
  if (parts.length !== 2) return;
  const [payloadB64, sigB64] = parts;
  let exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (typeof payload.exp === "number") exp = payload.exp;
  } catch {
    // use default TTL-based expiry
  }
  const now = Math.floor(Date.now() / 1000);
  sweepRevokedSigs(now);
  revokedSigs.set(sigB64, exp);
}

/** Reads and verifies the session cookie from an incoming request. */
export async function getSessionUser(
  request: Request
): Promise<{ username: string; mustChangePassword: boolean; roles: string[] } | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  return verifySessionToken(token);
}
