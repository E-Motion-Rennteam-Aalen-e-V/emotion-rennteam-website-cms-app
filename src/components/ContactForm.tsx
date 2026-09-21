"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useFormSubmit } from "@/lib/useFormSubmit";
import HoneypotField from "@/components/HoneypotField";
import TurnstileWidget from "@/components/TurnstileWidget";
import { CONTACT_SUBJECTS } from "@/lib/validation";

export default function ContactForm() {
  const { status, errors, errorMessage, submit } = useFormSubmit("/api/contact");

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
          Danke für deine Nachricht! Wir melden uns so schnell wie möglich bei dir.
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
          className="space-y-4"
        >
          {errorMessage && (
            <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-500">
              {errorMessage}
            </p>
          )}
          <HoneypotField />
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-accent-text">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-xs text-red-500">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              E-Mail <span className="text-accent-text">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="subject" className="text-sm font-medium">Betreff</label>
            <select
              id="subject"
              name="subject"
              defaultValue={CONTACT_SUBJECTS[0]}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            >
              {CONTACT_SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="message" className="text-sm font-medium">
              Nachricht <span className="text-accent-text">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              required
              maxLength={4000}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "message-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.message && (
              <p id="message-error" className="mt-1 text-xs text-red-500">
                {errors.message}
              </p>
            )}
          </div>
          <div className="flex items-start gap-2.5">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              aria-invalid={Boolean(errors.consent)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-surface accent-[var(--color-accent)]"
            />
            <label htmlFor="consent" className="text-xs text-muted">
              Ich stimme zu, dass meine Angaben zur Bearbeitung meiner Anfrage gespeichert werden.
              Weitere Infos in der{" "}
              <Link href="/datenschutz" className="text-accent-text underline">
                Datenschutzerklärung
              </Link>
              . *
            </label>
          </div>
          {errors.consent && (
            <p role="alert" className="text-xs text-red-500">{errors.consent}</p>
          )}
          <TurnstileWidget />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-lg bg-gradient-to-r from-accent to-accent/90 px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-all duration-300 hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:shadow-lg disabled:shadow-accent/20"
          >
            {status === "sending" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Wird gesendet…
              </span>
            ) : (
              "Nachricht senden"
            )}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
