"use client";

import { motion } from "framer-motion";

const SEGMENT_WIDTH = 200;

const POINTS: [number, number][] = [
  [0, 10],
  [40, 10],
  [46, 2],
  [52, 18],
  [58, 4],
  [64, 16],
  [70, 10],
  [120, 10],
  [126, 3],
  [132, 17],
  [138, 6],
  [144, 14],
  [150, 10],
  [200, 10],
];

function buildPath(offset: number) {
  return POINTS.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x + offset} ${y}`).join(" ");
}

const PATH_D = `${buildPath(0)} ${buildPath(SEGMENT_WIDTH)}`;

export default function HeaderPulseLine() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden opacity-70">
      <motion.svg
        viewBox={`0 0 ${SEGMENT_WIDTH} 20`}
        preserveAspectRatio="none"
        className="h-full w-[400%]"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 9, ease: "linear", repeat: Infinity }}
      >
        <defs>
          <linearGradient id="pulse-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="15%" stopColor="var(--accent)" />
            <stop offset="50%" stopColor="var(--accent-2)" />
            <stop offset="85%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={PATH_D}
          fill="none"
          stroke="url(#pulse-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </motion.svg>
    </div>
  );
}
