"use client";

import { useState } from "react";

const ALL_ROLES = ["superadmin", "Admin", "Sponsoring-Management"] as const;
const PRIVILEGED_ROLES = ["superadmin", "Admin"] as const;

interface UserRow {
  username: string;
  mustChangePassword: boolean;
  roles: string[];
  disabled: boolean;
}

interface UserManagerProps {
  adminUsername: string;
  initialUsers: UserRow[];
  /** true = Zugänge liegen in der Online-Benutzerverwaltung (Rollen/Sperren editierbar), false = lokale Legacy-Liste. */
  remote: boolean;
  /** Fehlermeldung vom serverseitigen Erstladen (z.B. Online-Benutzerverwaltung nicht erreichbar). */
  initialError?: string | null;
  /** true = eigener Zugang ist Superadmin, darf also "superadmin"/"Admin" vergeben und diese Zugänge bearbeiten. */
  canAssignPrivilegedRoles: boolean;
}

export default function UserManager({
  adminUsername,
  initialUsers,
  remote,
  initialError,
  canAssignPrivilegedRoles,
}: UserManagerProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [error, setError] = useState(initialError ?? "");

  const assignableRoles = canAssignPrivilegedRoles
    ? ALL_ROLES
    : ALL_ROLES.filter((role) => !(PRIVILEGED_ROLES as readonly string[]).includes(role));

  const [username, setUsername] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(canAssignPrivilegedRoles ? ["Admin"] : []);
  const [createdInfo, setCreatedInfo] = useState<{ username: string; password: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [showTempPassword, setShowTempPassword] = useState(false);

  // Die Online-Benutzerverwaltung erzwingt eine strengere Passwort-Richtlinie
  // (mind. 11 Zeichen, 3 von 4 Zeichenklassen) als die lokale Legacy-Liste
  // (nur Mindestlaenge 8) - der Hinweis muss dazu passen, sonst schlaegt das
  // Anlegen nach Eingabe scheinbar grundlos fehl.
  const passwordMinLength = remote ? 11 : 8;
  const passwordPolicyHint = remote
    ? "mind. 11 Zeichen, mind. 3 von 4 Zeichenklassen (Klein-/Großbuchstaben, Ziffern, Sonderzeichen)"
    : "mind. 8 Zeichen";

  async function loadUsers() {
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Benutzer konnten nicht geladen werden.");
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
    }
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setCreatedInfo(null);

    if (!username.trim()) {
      setFormError("Bitte einen Benutzernamen angeben.");
      return;
    }
    if (temporaryPassword.length < passwordMinLength) {
      setFormError(`Das temporäre Passwort muss ${passwordPolicyHint} enthalten.`);
      return;
    }
    if (remote && selectedRoles.length === 0) {
      setFormError("Bitte mindestens eine Rolle auswählen.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), temporaryPassword, roles: selectedRoles }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || "Benutzer konnte nicht angelegt werden.");
        return;
      }
      setCreatedInfo({ username: username.trim(), password: temporaryPassword });
      setUsername("");
      setTemporaryPassword("");
      setSelectedRoles(canAssignPrivilegedRoles ? ["Admin"] : []);
      await loadUsers();
    } catch {
      setFormError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(target: string) {
    if (!confirm(`Zugang von "${target}" wirklich entfernen?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(target)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Benutzer konnte nicht entfernt werden.");
        return;
      }
      await loadUsers();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
    }
  }

  async function handleToggleRole(target: string, currentRoles: string[], role: string) {
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    if (nextRoles.length === 0) {
      setError("Mindestens eine Rolle muss zugewiesen bleiben.");
      return;
    }
    setBusyUser(target);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(target)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: nextRoles }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Rolle konnte nicht geändert werden.");
        return;
      }
      await loadUsers();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setBusyUser(null);
    }
  }

  async function handleToggleDisabled(target: string, disabled: boolean) {
    setBusyUser(target);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(target)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !disabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Zugang konnte nicht gesperrt/entsperrt werden.");
        return;
      }
      await loadUsers();
    } catch {
      setError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setBusyUser(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-foreground">Neuen Benutzer anlegen</h2>
        <p className="mt-1 text-sm text-muted">
          Vergib einen Benutzernamen und ein beliebiges temporäres Passwort. Teile beides der Person mit – sie
          muss sich beim ersten Login damit anmelden und wird dann direkt aufgefordert, ein eigenes, geheimes
          Passwort zu vergeben.
        </p>

        <form onSubmit={handleCreate} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-username" className="mb-1.5 block text-sm font-medium text-foreground">
              Benutzername
            </label>
            <input
              id="new-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
              placeholder="z. B. Linda"
            />
          </div>
          <div>
            <label htmlFor="new-temp-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Temporäres Passwort
            </label>
            <div className="relative">
              <input
                id="new-temp-password"
                type={showTempPassword ? "text" : "password"}
                required
                minLength={passwordMinLength}
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors focus:border-accent"
                placeholder={passwordPolicyHint}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowTempPassword((v) => !v)}
                aria-label={showTempPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground"
              >
                {showTempPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {remote && (
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-foreground">Rollen</span>
              <div className="flex flex-wrap gap-3">
                {assignableRoles.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      className="accent-accent"
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <p role="alert" className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {formError}
            </p>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {submitting ? "Wird angelegt…" : "Benutzer anlegen"}
            </button>
          </div>
        </form>

        {createdInfo && (
          <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <p className="font-semibold">Benutzer &quot;{createdInfo.username}&quot; wurde angelegt.</p>
            <p className="mt-1">
              Zugangsdaten für die erste Anmeldung: Benutzername <strong>{createdInfo.username}</strong>, Passwort{" "}
              <PasswordReveal password={createdInfo.password} />. Bitte sicher übermitteln – nach dem ersten Login vergibt die
              Person selbst ein neues Passwort, das nur sie kennt.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-foreground">Bestehende Zugänge</h2>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-4 divide-y divide-border">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{adminUsername}</p>
              <p className="text-xs text-muted">Hauptadministrator – volle Berechtigung</p>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-text">
              Admin
            </span>
          </div>

          {users.length === 0 && (
            <p className="py-3 text-sm text-muted">Noch keine weiteren Benutzer angelegt.</p>
          )}

          {users.map((u) => (
            <div key={u.username} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{u.username}</p>
                <p className="text-xs text-muted">
                  {u.disabled
                    ? "Gesperrt"
                    : u.mustChangePassword
                      ? "Wartet auf erste Anmeldung / eigenes Passwort"
                      : "Aktiv"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const targetHasPrivilegedRole = u.roles.some((r) => (PRIVILEGED_ROLES as readonly string[]).includes(r));
                  const canManageThisTarget = canAssignPrivilegedRoles || !targetHasPrivilegedRole;
                  if (!canManageThisTarget) {
                    return (
                      <>
                        {u.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-text"
                          >
                            {role}
                          </span>
                        ))}
                        <span className="text-xs text-muted">Nur Superadmin kann diesen Zugang bearbeiten</span>
                      </>
                    );
                  }
                  return (
                    <>
                      {remote &&
                        assignableRoles.map((role) => {
                          const active = u.roles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              disabled={busyUser === u.username}
                              onClick={() => handleToggleRole(u.username, u.roles, role)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                active
                                  ? "bg-accent/15 text-accent-text"
                                  : "border border-border text-muted hover:text-foreground"
                              }`}
                            >
                              {role}
                            </button>
                          );
                        })}
                      {remote && (
                        <button
                          type="button"
                          disabled={busyUser === u.username}
                          onClick={() => handleToggleDisabled(u.username, u.disabled)}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-amber-500/50 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {u.disabled ? "Entsperren" : "Sperren"}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.username)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                      >
                        Entfernen
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PasswordReveal({ password }: { password: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <strong>{visible ? password : "•".repeat(password.length)}</strong>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        className="text-xs text-emerald-400 underline hover:text-emerald-200"
      >
        {visible ? "verbergen" : "anzeigen"}
      </button>
    </span>
  );
}
