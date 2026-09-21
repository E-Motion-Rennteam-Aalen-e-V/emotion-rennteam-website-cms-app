"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useFormSubmit } from "@/lib/useFormSubmit";
import HoneypotField from "@/components/HoneypotField";
import TurnstileWidget from "@/components/TurnstileWidget";
import { MEMBER_DEPARTMENTS, MEMBER_SKILLS } from "@/lib/validation";

export default function MemberApplicationForm() {
  const { status, errors, errorMessage, submit } = useFormSubmit("/api/mitmachen");

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
          Danke für deine Bewerbung! Wir melden uns so schnell wie möglich bei dir.
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
            <label htmlFor="member-name" className="text-sm font-medium">Name <span aria-hidden="true" className="text-red-500">*</span></label>
            <input
              id="member-name"
              name="name"
              required
              maxLength={120}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "member-name-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.name && (
              <p id="member-name-error" className="mt-1 text-xs text-red-500">
                {errors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="member-email" className="text-sm font-medium">E-Mail <span aria-hidden="true" className="text-red-500">*</span></label>
            <input
              id="member-email"
              name="email"
              type="email"
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "member-email-error" : undefined}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {errors.email && (
              <p id="member-email-error" className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="member-phone" className="text-sm font-medium">Telefon (optional)</label>
            <input
              id="member-phone"
              name="phone"
              type="tel"
              maxLength={32}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="member-department" className="text-sm font-medium">Fachbereich</label>
            <select
              id="member-department"
              name="department"
              defaultValue={MEMBER_DEPARTMENTS[0]}
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            >
              {MEMBER_DEPARTMENTS.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-3 rounded-lg border border-border/50 bg-accent/5 p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Fachliche Kenntnisse</label>
              <span className="text-xs text-muted">(optional aber vorteilhaft)</span>
            </div>
            <div className="space-y-2.5">
              {MEMBER_SKILLS.map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    name={`skill_${id}`}
                    className="h-4 w-4 rounded accent-[var(--color-accent)]"
                  />
                  <span className="text-sm group-hover:text-accent-text transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="member-message" className="text-sm font-medium">Motivation</label>
            <textarea
              id="member-message"
              name="message"
              rows={4}
              maxLength={4000}
              placeholder="Erzähl uns kurz, warum du beim E-Motion Rennteam mitmachen möchtest."
              className="mt-1 w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>
          <div className="flex items-start gap-2.5 sm:col-span-2">
            <input
              id="member-consent"
              name="consent"
              type="checkbox"
              required
              aria-invalid={Boolean(errors.consent)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-surface accent-[var(--color-accent)]"
            />
            <label htmlFor="member-consent" className="text-xs text-muted">
              Ich stimme zu, dass meine Angaben zur Bearbeitung meiner Bewerbung gespeichert
              werden. Weitere Infos in der{" "}
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
            {status === "sending" ? "Wird gesendet…" : "Bewerbung senden"}
          </button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
