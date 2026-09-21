"use client";

import { motion } from "framer-motion";

const competitions = [
  {
    name: "Formula Student Germany",
    location: "Hockenheimring, Deutschland",
    teams: "150+",
    region: "🇩🇪",
    prestige: "★★★★★",
  },
  {
    name: "Formula Student UK",
    location: "Silverstone, England",
    teams: "100+",
    region: "🇬🇧",
    prestige: "★★★★★",
  },
  {
    name: "Formula Student Austria",
    location: "Red Bull Ring, Österreich",
    teams: "80+",
    region: "🇦🇹",
    prestige: "★★★★",
  },
  {
    name: "Formula Student Spain",
    location: "Barcelona-Catalunya, Spanien",
    teams: "100+",
    region: "🇪🇸",
    prestige: "★★★★★",
  },
];

export default function FSCompetitions() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {competitions.map((comp, i) => (
        <motion.div
          key={comp.name}
          className="space-y-4 rounded-xl border border-border bg-gradient-to-br from-surface/80 to-surface p-5"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-2xl">{comp.region}</div>
              <h3 className="font-semibold text-foreground">{comp.name}</h3>
              <p className="text-xs text-muted">{comp.location}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Prestige</div>
              <div className="text-yellow-500">{comp.prestige}</div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Teams im Event</span>
              <span className="font-bold text-accent">{comp.teams}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
