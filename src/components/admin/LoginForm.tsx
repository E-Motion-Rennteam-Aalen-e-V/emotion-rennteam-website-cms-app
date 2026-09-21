"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Anmeldung fehlgeschlagen.");
        setStatus("error");
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
      setStatus("error");
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/60 via-accent-2/40 to-transparent opacity-60 blur-md"
      />
      <div className="relative rounded-2xl border border-border bg-surface/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-2">
            <Image src="/uploads/logo.png" alt="E-Motion Rennteam Aalen" width={36} height={36} className="h-9 w-9 object-contain" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-text">E-Motion Rennteam Aalen</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Redaktions-Login</h1>
          <p className="mt-1 text-sm text-muted">Melde dich an, um Inhalte der Website zu bearbeiten.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-foreground">
              Benutzername
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
              placeholder="admin"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {status === "loading" ? "Anmelden…" : "Anmelden"}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-5 text-xs text-muted">
          <Link href="/" className="transition-colors hover:text-foreground">
            ← Zurück zur Website
          </Link>
          <span>Geschützter Bereich</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div className="relative w-full max-w-md h-64" />}>
      <LoginFormInner />
    </Suspense>
  );
}
