#!/usr/bin/env node
// Generates a CMS_ADMIN_PASSWORD_HASH value for .env.local.
// Usage: node scripts/cms-hash-password.mjs "mein-passwort"

import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/cms-hash-password.mjs "mein-passwort"');
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
console.log(`${salt}:${hash}`);
