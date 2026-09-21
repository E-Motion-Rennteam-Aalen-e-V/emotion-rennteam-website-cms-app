"use client";

import { motion } from "framer-motion";

const stats = [
  { label: "Gegründet", value: "1981", unit: "USA" },
  { label: "Teams weltweit", value: "500+", unit: "aktiv" },
  { label: "Max. Punkte", value: "1.000", unit: "pro Saison" },
  { label: "Deutschland seit", value: "2006", unit: "Hockenheimring" },
];

export default function FSStats() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="space-y-2 rounded-lg border border-border bg-surface/50 p-4 sm:p-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="text-2xl font-bold text-accent sm:text-3xl">{stat.value}</div>
          <div className="text-xs text-muted">{stat.label}</div>
          <div className="text-xs font-medium text-foreground">{stat.unit}</div>
        </motion.div>
      ))}
    </div>
  );
}
