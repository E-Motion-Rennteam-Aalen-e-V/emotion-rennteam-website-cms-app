"use client";

import { motion } from "framer-motion";

const pillars = [
  {
    icon: "⚙️",
    title: "Konstruktion",
    items: ["Chassis Design", "Elektrik/Elektronik", "Aerodynamik"],
  },
  {
    icon: "💰",
    title: "Betriebswirtschaft",
    items: ["Cost Controlling", "Business Plan", "Budgetierung"],
  },
  {
    icon: "🚀",
    title: "Projekt Management",
    items: ["Planung", "Organisation", "Zeitmanagement"],
  },
  {
    icon: "📢",
    title: "Marketing",
    items: ["Sponsoring", "PR", "Events"],
  },
];

export default function FSPillars() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {pillars.map((pillar, i) => (
        <motion.div
          key={pillar.title}
          className="space-y-4 rounded-xl border border-border bg-gradient-to-br from-surface to-surface/50 p-6"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12 }}
        >
          <div className="text-3xl">{pillar.icon}</div>
          <h3 className="font-bold text-foreground">{pillar.title}</h3>
          <ul className="space-y-2">
            {pillar.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}
