"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface PasswordChangeFormProps {
  username: string;
  forced: boolean;
  /** true = Zugang liegt in der Online-Benutzerverwaltung, die eine strengere Passwort-Richtlinie durchsetzt. */
  strongPolicy?: boolean;
}

export default function PasswordChangeForm({ username, forced, strongPolicy = false }: PasswordChangeFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const minLength = strongPolicy ? 11 : 8;
  const policyHint = strongPolicy
    ? "mind. 11 Zeichen, mind. 3 von 4 Zeichenklassen (Klein-/Großbuchstaben, Ziffern, Sonderzeichen), ohne den Benutzernamen"
    : "mind. 8 Zeichen";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword.length < minLength) {
      setError(`Das Passwort muss ${policyHint} enthalten.`);
      setStatus("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Passwort konnte nicht gespeichert werden.");
        setStatus("error");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
      setStatus("error");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full max-w-md"
    >
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/60 via-accent-2/40 to-transparent opacity-60 blur-md" />
      <div className="relative rounded-2xl border border-border bg-surface/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-text">E-Motion Rennteam Aalen</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {forced ? "Eigenes Passwort vergeben" : "Passwort ändern"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {forced
              ? `Willkommen, ${username}! Bevor du fortfahren kannst, vergib bitte ein eigenes Passwort – merke es dir gut.`
              : "Vergib ein neues Passwort für dein Konto."}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-foreground">
              Neues Passwort
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              autoFocus
              minLength={minLength}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
              placeholder={policyHint}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground">
              Passwort wiederholen
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={minLength}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {status === "loading" ? "Speichern…" : "Passwort speichern"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
