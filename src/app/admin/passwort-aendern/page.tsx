import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/cms/auth";
import { findUser } from "@/lib/cms/users";
import PasswordChangeForm from "@/components/admin/PasswordChangeForm";

// Eigenstaendige Seite ausserhalb des geschuetzten (protected)-Layouts, damit
// ein Benutzer mit Passwort-Zwang sie erreichen kann, ohne durch die
// proxy.ts-Weiterleitung wieder hierher zurueckgeschickt zu werden.
export default async function ChangePasswordPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");

  // Zugaenge aus der Online-Benutzerverwaltung durchsetzen dort eine
  // strengere Passwort-Richtlinie (mind. 11 Zeichen, 3 von 4
  // Zeichenklassen) als die lokale Legacy-Liste (nur Mindestlaenge 8) -
  // das Formular muss den richtigen Hinweis zeigen, sonst schlaegt das
  // Speichern nach Eingabe scheinbar grundlos fehl.
  const strongPolicy = !findUser(session.username);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--foreground) 0px, var(--foreground) 1px, transparent 1px, transparent 64px)",
        }}
        aria-hidden
      />
      <PasswordChangeForm username={session.username} forced={session.mustChangePassword} strongPolicy={strongPolicy} />
    </main>
  );
}
