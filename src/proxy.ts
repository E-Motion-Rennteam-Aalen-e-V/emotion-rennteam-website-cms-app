import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/cms/auth";
import { canManageUsers } from "@/lib/cms/roles";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session: Awaited<ReturnType<typeof verifySessionToken>>;
  try {
    session = await verifySessionToken(token);
  } catch {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Ein neu angelegter Benutzer muss zuerst ein eigenes Passwort vergeben,
  // bevor er irgendetwas anderes im CMS tun kann.
  const isPasswordChangeRoute =
    pathname === "/admin/passwort-aendern" || pathname === "/api/admin/change-password";
  if (session.mustChangePassword && !isPasswordChangeRoute) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Bitte zuerst ein eigenes Passwort vergeben." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin/passwort-aendern", request.url));
  }

  // Die Benutzerverwaltung ist dem Hauptadministrator sowie Zugängen mit der
  // Rolle "Admin" aus der Online-Benutzerverwaltung vorbehalten.
  const isUserManagement = pathname.startsWith("/admin/benutzer") || pathname.startsWith("/api/admin/users");
  if (isUserManagement && !canManageUsers(session)) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Nur der Hauptadministrator kann Benutzer verwalten." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Das Beenden des CMS-Servers betrifft alle Redakteure gleichzeitig -
  // ebenfalls dem Hauptadministrator vorbehalten.
  if (pathname === "/api/admin/shutdown" && session.username !== process.env.CMS_ADMIN_USER) {
    return NextResponse.json({ error: "Nur der Hauptadministrator kann das CMS beenden." }, { status: 403 });
  }

  return NextResponse.next();
}
