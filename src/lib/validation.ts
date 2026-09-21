/**
 * Shared server-side validation for the site's forms (contact,
 * member application, sponsor inquiry). Kept dependency-free and framework
 * agnostic so it can be unit tested in isolation and reused by every
 * API route handler under `src/app/api`.
 */

import { SPONSOR_TIERS as SHARED_SPONSOR_TIERS, TEAM_DEPARTMENTS } from "@/lib/team-departments";

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> =
  | { valid: true; errors?: undefined; data: T; isBot: boolean }
  | { valid: false; errors: FieldErrors; data?: undefined; isBot?: undefined };

// Practical RFC 5321/5322 approximation: no leading/trailing/consecutive dots
// in the local or domain part, a domain with at least one label + a
// letters-only TLD of 2+ chars. Deliberately stricter than the previous
// "anything@anything.anything" pattern to catch obviously-malformed input
// client-side bots and typo'd addresses both produce.
const EMAIL_RE =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// Well-known disposable/temporary-inbox domains. Not exhaustive (new ones
// appear constantly), but it catches the handful of services spam bots and
// low-effort duplicate signups reach for most often. Kept as a plain
// rejection (not a silent bot-flag) so a genuine sender gets a clear error
// instead of a submission that silently never arrives.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "dispostable.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mailnesia.com",
  "mintemail.com",
]);

export function isDisposableEmail(value: string): boolean {
  const domain = value.split("@")[1]?.toLowerCase();
  return domain !== undefined && DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export const LIMITS = {
  name: 120,
  email: 254,
  phone: 32,
  subject: 60,
  message: 4000,
  company: 160,
} as const;

/** Trims and strips control/zero-width characters that have no business in form text. */
export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  // Strip control characters and zero-width/BOM characters.
  return input.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "").trim();
}

export function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= LIMITS.email && EMAIL_RE.test(value);
}

function readField(data: Record<string, unknown>, key: string): string {
  return sanitizeText(data[key]);
}

/**
 * A real visitor needs at least this long to read the form and type into it.
 * Scripted bots that fetch the page, fill every field, and POST typically do
 * so in well under a second.
 */
const MIN_HUMAN_SUBMIT_MS = 1500;

/**
 * Combines two independent bot signals:
 *  - Honeypot: a hidden field ("website") that real users never fill in but
 *    bots that auto-fill every input trip.
 *  - Timing trap: a hidden "formRenderedAt" timestamp (set client-side when
 *    the form mounts) that flags submissions completed implausibly fast.
 * Callers should still report success to avoid tipping the bot off, just
 * skip actually delivering the submission.
 */
function isBotSubmission(data: Record<string, unknown>): boolean {
  if (sanitizeText(data.website).length > 0) return true;

  const renderedAt = Number(data.formRenderedAt);
  if (Number.isFinite(renderedAt) && renderedAt > 0) {
    const elapsed = Date.now() - renderedAt;
    if (elapsed < MIN_HUMAN_SUBMIT_MS) return true;
  }

  return false;
}

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

export type NewsletterFormData = {
  email: string;
};

export function validateNewsletterForm(body: unknown): ValidationResult<NewsletterFormData> {
  const data = asRecord(body);
  const errors: FieldErrors = {};

  const email = readField(data, "email");
  if (!email) errors.email = "Bitte gib deine E-Mail-Adresse an.";
  else if (!isValidEmail(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return { valid: true, isBot: isBotSubmission(data), data: { email } };
}

export type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export const CONTACT_SUBJECTS = [
  "Allgemeine Anfrage",
  "Sponsoring",
  "Presse",
  "Sonstiges",
] as const;

export function validateContactForm(body: unknown): ValidationResult<ContactFormData> {
  const data = asRecord(body);
  const errors: FieldErrors = {};

  const name = readField(data, "name");
  const email = readField(data, "email");
  const subject = readField(data, "subject") || CONTACT_SUBJECTS[0];
  const message = readField(data, "message");

  if (!name) errors.name = "Bitte gib deinen Namen an.";
  else if (name.length > LIMITS.name) errors.name = "Name ist zu lang.";

  if (!email) errors.email = "Bitte gib deine E-Mail-Adresse an.";
  else if (!isValidEmail(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  else if (isDisposableEmail(email)) errors.email = "Bitte nutze eine reguläre, dauerhafte E-Mail-Adresse.";

  if (!(CONTACT_SUBJECTS as readonly string[]).includes(subject)) {
    errors.subject = "Ungültiger Betreff.";
  }

  if (!message) errors.message = "Bitte gib eine Nachricht an.";
  else if (message.length > LIMITS.message) errors.message = "Nachricht ist zu lang.";

  if (!data.consent) errors.consent = "Bitte stimme der Datenverarbeitung zu.";

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    isBot: isBotSubmission(data),
    data: { name, email, subject, message },
  };
}

export type MemberApplicationFormData = {
  name: string;
  email: string;
  phone: string;
  department: string;
  message: string;
  skills: string[];
};

export const MEMBER_SKILLS = [
  { id: "cad", label: "CAD Kenntnisse" },
  { id: "matlab", label: "MATLAB Kenntnisse" },
  { id: "video_photo", label: "Video & Foto Editing" },
] as const;

// Reuses the same single source of truth as the Team page and CMS
// "Abteilung" field (see team-departments.ts), plus the form-only fallback
// option for applicants who haven't decided on a department yet.
export const MEMBER_DEPARTMENTS = [...TEAM_DEPARTMENTS, "Noch unentschlossen"] as const;

export function validateMemberApplicationForm(
  body: unknown
): ValidationResult<MemberApplicationFormData> {
  const data = asRecord(body);
  const errors: FieldErrors = {};

  const name = readField(data, "name");
  const email = readField(data, "email");
  const phone = readField(data, "phone");
  const department = readField(data, "department") || MEMBER_DEPARTMENTS[0];
  const message = readField(data, "message");
  const skills = MEMBER_SKILLS.filter(({ id }) => data[`skill_${id}`] === true || data[`skill_${id}`] === "on").map(
    ({ label }) => label
  );

  if (!name) errors.name = "Bitte gib deinen Namen an.";
  else if (name.length > LIMITS.name) errors.name = "Name ist zu lang.";

  if (!email) errors.email = "Bitte gib deine E-Mail-Adresse an.";
  else if (!isValidEmail(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  else if (isDisposableEmail(email)) errors.email = "Bitte nutze eine reguläre, dauerhafte E-Mail-Adresse.";

  if (phone && phone.length > LIMITS.phone) errors.phone = "Telefonnummer ist zu lang.";

  if (!(MEMBER_DEPARTMENTS as readonly string[]).includes(department)) {
    errors.department = "Ungültiger Fachbereich.";
  }

  if (message.length > LIMITS.message) errors.message = "Nachricht ist zu lang.";

  if (!data.consent) errors.consent = "Bitte stimme der Datenverarbeitung zu.";

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    isBot: isBotSubmission(data),
    data: { name, email, phone, department, message, skills },
  };
}

export type SponsorFormData = {
  company: string;
  contact: string;
  email: string;
  phone: string;
  tier: string;
  message: string;
};

// Reuses the same single source of truth as the CMS sponsor collection's
// "Sponsoring-Stufe" field (see team-departments.ts), plus the form-only
// fallback option for prospective sponsors who haven't decided on a tier yet.
export const SPONSOR_TIERS = [...SHARED_SPONSOR_TIERS, "Noch unentschlossen"] as const;

export function validateSponsorForm(body: unknown): ValidationResult<SponsorFormData> {
  const data = asRecord(body);
  const errors: FieldErrors = {};

  const company = readField(data, "company");
  const contact = readField(data, "contact");
  const email = readField(data, "email");
  const phone = readField(data, "phone");
  const tier = readField(data, "tier") || SPONSOR_TIERS[SPONSOR_TIERS.length - 1];
  const message = readField(data, "message");

  if (!company) errors.company = "Bitte gib den Firmennamen an.";
  else if (company.length > LIMITS.company) errors.company = "Firmenname ist zu lang.";

  if (!contact) errors.contact = "Bitte gib eine Ansprechperson an.";
  else if (contact.length > LIMITS.name) errors.contact = "Name ist zu lang.";

  if (!email) errors.email = "Bitte gib eine E-Mail-Adresse an.";
  else if (!isValidEmail(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  else if (isDisposableEmail(email)) errors.email = "Bitte nutze eine reguläre, dauerhafte E-Mail-Adresse.";

  if (phone && phone.length > LIMITS.phone) errors.phone = "Telefonnummer ist zu lang.";

  if (!(SPONSOR_TIERS as readonly string[]).includes(tier)) {
    errors.tier = "Ungültige Sponsoring-Stufe.";
  }

  if (message.length > LIMITS.message) errors.message = "Nachricht ist zu lang.";

  if (!data.consent) errors.consent = "Bitte stimme der Datenverarbeitung zu.";

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    isBot: isBotSubmission(data),
    data: { company, contact, email, phone, tier, message },
  };
}

export type MediaKitFormData = {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  categories: string[];
  details: string;
};

/**
 * Deliberately generic instead of naming individual events (FSG, Alpe
 * Adria, ...): the event roster changes every season, so per-event
 * checkboxes would need updating every year. "Renneinsatz" plus the free-text
 * `details` field covers specific event/season requests without that upkeep.
 */
export const MEDIAKIT_CATEGORIES = [
  { id: "team", label: "Teamfotos" },
  { id: "vehicle", label: "Fahrzeugfotos (Studio)" },
  { id: "race", label: "Renneinsatz-Fotos" },
  { id: "logo", label: "Logo & Markenmaterial" },
  { id: "video", label: "Video-Material" },
] as const;

export function validateMediaKitForm(body: unknown): ValidationResult<MediaKitFormData> {
  const data = asRecord(body);
  const errors: FieldErrors = {};

  const firstName = readField(data, "firstName");
  const lastName = readField(data, "lastName");
  const company = readField(data, "company");
  const email = readField(data, "email");
  const details = readField(data, "details");
  const categories = MEDIAKIT_CATEGORIES.filter(
    ({ id }) => data[`category_${id}`] === true || data[`category_${id}`] === "on"
  ).map(({ label }) => label);

  if (!firstName) errors.firstName = "Bitte gib deinen Vornamen an.";
  else if (firstName.length > LIMITS.name) errors.firstName = "Vorname ist zu lang.";

  if (!lastName) errors.lastName = "Bitte gib deinen Nachnamen an.";
  else if (lastName.length > LIMITS.name) errors.lastName = "Nachname ist zu lang.";

  if (company && company.length > LIMITS.company) errors.company = "Firmenname ist zu lang.";

  if (!email) errors.email = "Bitte gib deine E-Mail-Adresse an.";
  else if (!isValidEmail(email)) errors.email = "Bitte gib eine gültige E-Mail-Adresse an.";
  else if (isDisposableEmail(email)) errors.email = "Bitte nutze eine reguläre, dauerhafte E-Mail-Adresse.";

  if (details.length > LIMITS.message) errors.details = "Text ist zu lang.";

  if (!data.consent) errors.consent = "Bitte stimme der Datenverarbeitung zu.";

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    isBot: isBotSubmission(data),
    data: { firstName, lastName, company, email, categories, details },
  };
}
