"use client";

import { motion } from "framer-motion";

const events = [
  {
    year: 1981,
    title: "Geburt der Formula Student",
    description: "SAE gründet den Wettbewerb in den USA",
    highlight: true,
  },
  {
    year: 2006,
    title: "Deutschland-Start",
    description: "Erstes Rennen am Hockenheimring unter Schirmherrschaft des VDI",
    highlight: true,
  },
  {
    year: 2010,
    title: "Formula Student Electric",
    description: "Einführung der elektrischen Kategorie – Zukunftstechnologie im Fokus",
    highlight: true,
  },
  {
    year: 2024,
    title: "Global Presence",
    description: "500+ Teams aus über 50 Ländern weltweit aktiv",
    highlight: false,
  },
];

export default function FSTimeline() {
  return (
    <div className="space-y-6">
      {events.map((event, i) => (
        <motion.div
          key={event.year}
          className="flex gap-6"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.15 }}
        >
          {/* Timeline dot */}
          <div className="flex flex-col items-center">
            <motion.div
              className={`h-3 w-3 rounded-full ${
                event.highlight ? "bg-accent" : "bg-border"
              }`}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 + 0.1 }}
            />
            {i < events.length - 1 && <div className="mt-2 h-12 w-px bg-gradient-to-b from-border to-transparent" />}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2 pb-6">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-accent">{event.year}</span>
              <h3 className="font-semibold text-foreground">{event.title}</h3>
            </div>
            <p className="text-sm text-muted">{event.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
