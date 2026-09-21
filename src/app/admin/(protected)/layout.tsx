import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/cms/auth";
import { canManageUsers, accessibleCollectionNames } from "@/lib/cms/roles";
import { collections } from "@/lib/cms/collections";
import Sidebar from "@/components/admin/Sidebar";
import LogoutButton from "@/components/admin/LogoutButton";
import ShutdownButton from "@/components/admin/ShutdownButton";
import MobileNav from "@/components/admin/MobileNav";
import UpdateBanner from "@/components/admin/UpdateBanner";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  if (session.mustChangePassword) redirect("/admin/passwort-aendern");

  const isAdmin = session.username === process.env.CMS_ADMIN_USER;
  const canManage = canManageUsers(session);
  const visibleCollectionNames = accessibleCollectionNames(session, collections.map((c) => c.name));

  return (
    <div className="min-h-screen bg-background">
      <UpdateBanner />
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <MobileNav isAdmin={canManage} visibleCollectionNames={visibleCollectionNames} />
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2">
                <Image src="/uploads/logo.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">E-Motion CMS</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:inline">Angemeldet als {session.username}</span>
            {isAdmin && <ShutdownButton />}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-20">
            <Sidebar isAdmin={canManage} visibleCollectionNames={visibleCollectionNames} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
