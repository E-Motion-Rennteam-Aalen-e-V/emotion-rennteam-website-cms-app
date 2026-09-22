"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface DashboardCardProps {
  href: string;
  title: string;
  subtitle: string;
  count: number;
  icon: "folder" | "image";
}

function CardIcon({ icon }: { icon: DashboardCardProps["icon"] }) {
  if (icon === "image") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 15-5-5L5 21" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

export default function DashboardCard({ href, title, subtitle, count, icon }: DashboardCardProps) {
  return (
    <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <Link href={href} className="glass-card group block p-5">
        <div className="flex items-center justify-between">
          <div className="glass-icon flex h-9 w-9 items-center justify-center rounded-xl">
            <CardIcon icon={icon} />
          </div>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-muted">{count}</span>
        </div>
        <h2 className="mt-4 font-semibold text-foreground transition-colors group-hover:text-accent-text">{title}</h2>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </Link>
    </motion.div>
  );
}
