"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useFormSubmit } from "@/lib/useFormSubmit";
import HoneypotField from "@/components/HoneypotField";
import TurnstileWidget from "@/components/TurnstileWidget";
import { MEDIAKIT_CATEGORIES } from "@/lib/validation";

export default function MediaKitRequestForm() {
  const { status, errors, errorMessage, submit } = useFormSubmit("/api/mediakit");

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
          Danke für deine Anfrage! Wir stellen das passende Material zusammen und melden uns
          zeitnah bei dir.
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
            <label htmlFor="mk-firstName" className="text-sm font-medium">
              Vorname <span className="text-accent-text">*</span>
            </label>
            <input
              id="mk-firstName"
              name="firstName"
              required
              maxLength={120}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "mk-firstName-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.firstName && (
              <p id="mk-firstName-error" className="mt-1 text-xs text-red-500">
                {errors.firstName}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="mk-lastName" className="text-sm font-medium">
              Nachname <span className="text-accent-text">*</span>
            </label>
            <input
              id="mk-lastName"
              name="lastName"
              required
              maxLength={120}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "mk-lastName-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.lastName && (
              <p id="mk-lastName-error" className="mt-1 text-xs text-red-500">
                {errors.lastName}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="mk-company" className="text-sm font-medium">Unternehmen (optional)</label>
            <input
              id="mk-company"
              name="company"
              maxLength={160}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="mk-email" className="text-sm font-medium">
              E-Mail <span className="text-accent-text">*</span>
            </label>
            <input
              id="mk-email"
              name="email"
              type="email"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "mk-email-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.email && (
              <p id="mk-email-error" className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-3 rounded-lg border border-border/50 bg-accent/5 p-4">
            <label className="text-sm font-medium">Welches Material interessiert dich?</label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {MEDIAKIT_CATEGORIES.map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    name={`category_${id}`}
                    className="h-4 w-4 rounded accent-[var(--color-accent)]"
                  />
                  <span className="text-sm group-hover:text-accent-text transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="mk-details" className="text-sm font-medium">
              Konkrete Wünsche (optional)
            </label>
            <textarea
              id="mk-details"
              name="details"
              rows={3}
              maxLength={4000}
              placeholder="Z.B. ein bestimmtes Event, Bildformat oder Verwendungszweck."
              aria-invalid={Boolean(errors.details)}
              aria-describedby={errors.details ? "mk-details-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.details && (
              <p id="mk-details-error" className="mt-1 text-xs text-red-500">
                {errors.details}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2.5 sm:col-span-2">
            <input
              id="mk-consent"
              name="consent"
              type="checkbox"
              required
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? "mk-consent-error" : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-surface accent-[var(--color-accent)]"
            />
            <label htmlFor="mk-consent" className="text-xs text-muted">
              Ich stimme zu, dass meine Angaben zur Bearbeitung der Anfrage gespeichert werden.
              Weitere Infos in der{" "}
              <Link href="/datenschutz" className="text-accent-text underline">
                Datenschutzerklärung
              </Link>
              . *
            </label>
          </div>
          {errors.consent && (
            <p id="mk-consent-error" role="alert" className="sm:col-span-2 text-xs text-red-500">{errors.consent}</p>
          )}
          <TurnstileWidget />
          <button
            type="submit"
            disabled={status === "sending"}
            className="sm:col-span-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {status === "sending" ? "Wird gesendet…" : "Material anfragen"}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
