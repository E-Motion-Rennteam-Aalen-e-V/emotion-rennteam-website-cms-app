"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useFormSubmit } from "@/lib/useFormSubmit";
import HoneypotField from "@/components/HoneypotField";
import TurnstileWidget from "@/components/TurnstileWidget";
import { SPONSOR_TIERS } from "@/lib/validation";

export default function SponsorForm() {
  const { status, errors, errorMessage, submit } = useFormSubmit("/api/sponsoring");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    payload.consent = formData.get("consent") === "on" ? "true" : "";
    await submit(payload);
  }

  return (
    <AnimatePresence mode="wait">
      {status === "sent" ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-accent/40 bg-surface p-6 text-sm text-muted"
          role="status"
        >
          Vielen Dank für dein Interesse an einer Partnerschaft! Wir melden uns zeitnah bei euch.
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          {errorMessage && (
            <p
              role="alert"
              className="sm:col-span-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-500"
            >
              {errorMessage}
            </p>
          )}
          <HoneypotField />
          <div>
            <label htmlFor="company" className="text-sm font-medium">Firmenname</label>
            <input
              id="company"
              name="company"
              required
              maxLength={160}
              aria-invalid={Boolean(errors.company)}
              aria-describedby={errors.company ? "company-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.company && (
              <p id="company-error" className="mt-1 text-xs text-red-500">
                {errors.company}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="contact" className="text-sm font-medium">Ansprechpartner:in</label>
            <input
              id="contact"
              name="contact"
              required
              maxLength={120}
              aria-invalid={Boolean(errors.contact)}
              aria-describedby={errors.contact ? "contact-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.contact && (
              <p id="contact-error" className="mt-1 text-xs text-red-500">
                {errors.contact}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="sponsor-email" className="text-sm font-medium">E-Mail</label>
            <input
              id="sponsor-email"
              name="email"
              type="email"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "sponsor-email-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.email && (
              <p id="sponsor-email-error" className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium">Telefon (optional)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              maxLength={32}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tier" className="text-sm font-medium">Interessiert an</label>
            <select
              id="tier"
              name="tier"
              defaultValue={SPONSOR_TIERS[SPONSOR_TIERS.length - 1]}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            >
              {SPONSOR_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sponsor-message" className="text-sm font-medium">Nachricht</label>
            <textarea
              id="sponsor-message"
              name="message"
              rows={4}
              maxLength={4000}
              placeholder="Erzählt uns kurz von eurem Unternehmen und wie ihr euch eine Partnerschaft vorstellt."
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="flex items-start gap-2.5 sm:col-span-2">
            <input
              id="sponsor-consent"
              name="consent"
              type="checkbox"
              required
              aria-invalid={Boolean(errors.consent)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-surface accent-[var(--color-accent)]"
            />
            <label htmlFor="sponsor-consent" className="text-xs text-muted">
              Wir stimmen zu, dass unsere Angaben zur Bearbeitung der Anfrage gespeichert werden.
              Weitere Infos in der{" "}
              <Link href="/datenschutz" className="text-accent-text underline">
                Datenschutzerklärung
              </Link>
              . *
            </label>
          </div>
          {errors.consent && (
            <p role="alert" className="sm:col-span-2 text-xs text-red-500">{errors.consent}</p>
          )}
          <TurnstileWidget />
          <button
            type="submit"
            disabled={status === "sending"}
            className="sm:col-span-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {status === "sending" ? "Wird gesendet…" : "Anfrage senden"}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
