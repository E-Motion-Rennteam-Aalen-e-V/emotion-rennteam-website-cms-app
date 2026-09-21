import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  if (candidate.length !== hashBuffer.length) return false;
  return timingSafeEqual(candidate, hashBuffer);
}

// Fixed salt used only to keep the "no such user" login path doing the same
// amount of scrypt work as a real verification. Never used to store or
// verify any actual account's password.
const DUMMY_SALT = "0".repeat(32);

/**
 * Burns roughly the same CPU time as verifyPassword() without needing a
 * real stored hash. Call this on the "username not found" branch of a login
 * so that a request for a nonexistent user takes about as long as a request
 * for a real user with a wrong password — otherwise the two cases are
 * distinguishable by response time, letting an attacker enumerate valid
 * usernames.
 */
export function burnPasswordVerificationTime(password: string): void {
  scryptSync(password, DUMMY_SALT, KEY_LENGTH);
}
