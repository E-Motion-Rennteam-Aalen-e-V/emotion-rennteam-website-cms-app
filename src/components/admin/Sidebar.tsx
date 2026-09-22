"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { collections } from "@/lib/cms/collections";

interface SidebarProps {
  isAdmin: boolean;
  /** Namen der Collections, die dieser Zugang sehen darf (siehe roles.ts). */
  visibleCollectionNames: readonly string[];
}

export default function Sidebar({ isAdmin, visibleCollectionNames }: SidebarProps) {
  const pathname = usePathname();
  const visibleCollections = collections.filter((c) => visibleCollectionNames.includes(c.name));

  return (
    <nav className="glass-card space-y-1 p-3">
      <Link
        href="/admin"
        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          pathname === "/admin" ? "glass-active text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"
        }`}
      >
        Übersicht
      </Link>
      <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Inhalte</p>
      {visibleCollections.map((c) => {
        const href = `/admin/${c.name}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={c.name}
            href={href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "glass-active text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            {c.label}
          </Link>
        );
      })}

      <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Werkzeuge</p>
      <Link
        href="/admin/medien"
        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          pathname === "/admin/medien" ? "glass-active text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"
        }`}
      >
        Medienbibliothek
      </Link>

      {isAdmin && (
        <>
          <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Verwaltung</p>
          <Link
            href="/admin/benutzer"
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/admin/benutzer" ? "glass-active text-foreground" : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            Benutzerverwaltung
          </Link>
        </>
      )}
    </nav>
  );
}
