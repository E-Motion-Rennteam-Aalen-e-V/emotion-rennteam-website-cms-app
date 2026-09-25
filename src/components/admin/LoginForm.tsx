"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function HuskyMascot({ isHiding, isHappy }: { isHiding: boolean; isHappy: boolean }) {
  return (
    <div className="relative mx-auto mb-2 h-40 w-32">
      <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden>
        {/* === EARS === */}
        {/* Left ear outer */}
        <ellipse cx="28" cy="32" rx="14" ry="18" transform="rotate(-15 28 32)" fill="#6b7280" />
        {/* Left ear inner */}
        <ellipse cx="28" cy="34" rx="8" ry="11" transform="rotate(-15 28 34)" fill="#f9a8d4" />
        {/* Right ear outer */}
        <ellipse cx="92" cy="32" rx="14" ry="18" transform="rotate(15 92 32)" fill="#6b7280" />
        {/* Right ear inner */}
        <ellipse cx="92" cy="34" rx="8" ry="11" transform="rotate(15 92 34)" fill="#f9a8d4" />

        {/* === HEAD === */}
        <ellipse cx="60" cy="62" rx="40" ry="36" fill="#9ca3af" />

        {/* === FACE WHITE PATCHES === */}
        {/* Muzzle white area */}
        <ellipse cx="60" cy="74" rx="22" ry="16" fill="#f3f4f6" />
        {/* Left cheek white */}
        <ellipse cx="36" cy="66" rx="10" ry="12" fill="#e5e7eb" />
        {/* Right cheek white */}
        <ellipse cx="84" cy="66" rx="10" ry="12" fill="#e5e7eb" />
        {/* Forehead white strip */}
        <ellipse cx="60" cy="48" rx="12" ry="8" fill="#e5e7eb" />

        {/* === EYES (hidden when isHiding) === */}
        {!isHiding && (
          <>
            {/* Left eye white */}
            <ellipse cx="43" cy="60" rx="9" ry="9" fill="white" />
            {/* Left eye iris */}
            <ellipse cx="43" cy="60" rx="6" ry="6" fill="#60a5fa" />
            {/* Left pupil */}
            <ellipse cx="44" cy="60" rx="3.5" ry="3.5" fill="#1e293b" />
            {/* Left eye shine */}
            <ellipse cx="46" cy="57" rx="1.5" ry="1.5" fill="white" />

            {/* Right eye white */}
            <ellipse cx="77" cy="60" rx="9" ry="9" fill="white" />
            {/* Right eye iris */}
            <ellipse cx="77" cy="60" rx="6" ry="6" fill="#60a5fa" />
            {/* Right pupil */}
            <ellipse cx="78" cy="60" rx="3.5" ry="3.5" fill="#1e293b" />
            {/* Right eye shine */}
            <ellipse cx="80" cy="57" rx="1.5" ry="1.5" fill="white" />
          </>
        )}

        {/* Closed eyes when hiding */}
        {isHiding && (
          <>
            <path d="M35 60 Q43 56 51 60" stroke="#374151" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M69 60 Q77 56 85 60" stroke="#374151" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* === NOSE === */}
        <ellipse cx="60" cy="73" rx="7" ry="5" fill="#374151" />
        {/* Nose shine */}
        <ellipse cx="58" cy="71" rx="2" ry="1.5" fill="#6b7280" />

        {/* === MOUTH === */}
        {isHappy ? (
          <>
            <path d="M53 79 Q60 86 67 79" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* Tongue */}
            <ellipse cx="60" cy="84" rx="5" ry="4" fill="#f472b6" />
          </>
        ) : (
          <path d="M53 79 Q60 83 67 79" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}

        {/* === BODY / CHEST (static — visually connects head to paws) === */}
        <ellipse cx="60" cy="104" rx="22" ry="12" fill="#9ca3af" />

        {/* === PAWS (animate up to cover eyes) === */}
        {/* Left paw */}
        <motion.g
          animate={{ y: isHiding ? -70 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          {/* Left paw base */}
          <rect x="18" y="118" width="32" height="26" rx="12" fill="#6b7280" />
          {/* Left paw pads */}
          <ellipse cx="34" cy="136" rx="8" ry="5" fill="#9ca3af" />
          <ellipse cx="26" cy="132" rx="4" ry="3" fill="#9ca3af" />
          <ellipse cx="34" cy="130" rx="4" ry="3" fill="#9ca3af" />
          <ellipse cx="42" cy="132" rx="4" ry="3" fill="#9ca3af" />
        </motion.g>

        {/* Right paw */}
        <motion.g
          animate={{ y: isHiding ? -70 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut", delay: 0.05 }}
        >
          {/* Right paw base */}
          <rect x="70" y="118" width="32" height="26" rx="12" fill="#6b7280" />
          {/* Right paw pads */}
          <ellipse cx="86" cy="136" rx="8" ry="5" fill="#9ca3af" />
          <ellipse cx="78" cy="132" rx="4" ry="3" fill="#9ca3af" />
          <ellipse cx="86" cy="130" rx="4" ry="3" fill="#9ca3af" />
          <ellipse cx="94" cy="132" rx="4" ry="3" fill="#9ca3af" />
        </motion.g>
      </svg>
    </div>
  );
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
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
      setStatus("success");
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
      setStatus("error");
    } finally {
      submittingRef.current = false;
    }
  }

  const isHiding = isPasswordFocused && !showPassword;
  const isHappy = status === "success";

  return (
    <div className="relative w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/40 via-accent-2/20 to-transparent opacity-60 blur-md"
      />
      <div className="glass-card relative p-8 shadow-2xl sm:p-10">
        <div className="mb-6 flex flex-col items-center text-center">
          <HuskyMascot isHiding={isHiding} isHappy={isHappy} />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-text">E-Motion Rennteam Aalen</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Redaktions-Login</h1>
          <motion.p
            key={isHiding ? "hiding" : isHappy ? "happy" : "default"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-sm text-muted"
          >
            {isHiding
              ? "Ich guck nicht! 🐾"
              : isHappy
              ? "Willkommen zurück! 🎉"
              : "Melde dich an, um Inhalte zu bearbeiten."}
          </motion.p>
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
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-11 text-sm text-foreground outline-none transition-colors focus:border-accent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="glass-icon relative w-full overflow-hidden rounded-lg px-4 py-3 text-sm font-semibold shadow-lg shadow-[var(--glass-1)]/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
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
    <Suspense fallback={<div className="relative h-64 w-full max-w-md" />}>
      <LoginFormInner />
    </Suspense>
  );
}
