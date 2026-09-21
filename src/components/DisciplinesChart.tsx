"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Discipline = {
  name: string;
  points: number;
  category: "Statisch" | "Dynamisch";
};

const DISCIPLINES: Discipline[] = [
  { name: "Endurance", points: 300, category: "Dynamisch" },
  { name: "Engineering Design", points: 150, category: "Statisch" },
  { name: "Auto-X", points: 150, category: "Dynamisch" },
  { name: "Cost Report", points: 100, category: "Statisch" },
  { name: "Efficiency", points: 100, category: "Dynamisch" },
  { name: "Business Plan", points: 75, category: "Statisch" },
  { name: "Acceleration", points: 75, category: "Dynamisch" },
  { name: "SkidPad", points: 50, category: "Dynamisch" },
];

// Sequential ramp on the site accent hue, light → dark, mapped high points → dark.
const RAMP = [
  "#0071b5",
  "#1d80bf",
  "#3b90c9",
  "#589fd3",
  "#75aede",
  "#92bde8",
  "#b0cdf2",
  "#cddcfc",
];

const TOTAL = DISCIPLINES.reduce((sum, d) => sum + d.points, 0);
const MAX = Math.max(...DISCIPLINES.map((d) => d.points));

export default function DisciplinesChart() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>0</span>
        <span>{TOTAL} Punkte gesamt</span>
      </div>
      <ul className="space-y-3">
        {DISCIPLINES.map((d, i) => {
          const widthPct = (d.points / MAX) * 100;
          const isActive = active === d.name;
          return (
            <li key={d.name}>
              <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
                <span className="font-medium text-foreground">
                  {d.name}
                  <span className="ml-2 text-xs font-normal text-muted">{d.category}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">{d.points} Pkt.</span>
              </div>
              <div
                className="h-6 w-full overflow-hidden rounded-full bg-surface-2"
                onMouseEnter={() => setActive(d.name)}
                onMouseLeave={() => setActive(null)}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: RAMP[i],
                    opacity: isActive ? 1 : 0.9,
                  }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${widthPct}%` }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-muted">
        Statische Disziplinen (Cost Report, Business Plan, Engineering Design) bewerten
        Konstruktion und Wirtschaftlichkeit, dynamische Disziplinen (Acceleration, SkidPad,
        Auto-X, Efficiency, Endurance) die tatsächliche Fahrzeugleistung auf der Strecke.
      </p>
    </div>
  );
}
