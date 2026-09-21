"use client";

import { motion } from "framer-motion";

export default function HeroCarDrive() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 z-10 overflow-hidden sm:top-10">
      <motion.div
        initial={{ x: "-40vw", opacity: 0 }}
        animate={{ x: "140vw", opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 3.2,
          delay: 0.4,
          ease: [0.45, 0, 0.2, 1],
          opacity: { duration: 3.2, times: [0, 0.1, 0.85, 1] },
          repeat: Infinity,
          repeatDelay: 6,
        }}
        className="w-[220px] sm:w-[300px]"
      >
        <svg
          viewBox="0 0 240 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-auto w-full text-accent drop-shadow-[0_0_12px_rgba(74,99,247,0.7)]"
        >
          <path
            d="M2 62 H16 c2-10 10-17 20-17 h6 l10-14 c3-4 8-7 13-7 h44 c6 0 11 3 14 8 l7 12 h30 c11 0 20 8 21 18 h4"
            fill="currentColor"
            fillOpacity="0.12"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M96 24 l-8 21 h56 l-10-21"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M164 39 h20 M2 55 h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="54" cy="66" r="17" fill="#050608" stroke="currentColor" strokeWidth="5" />
          <circle cx="54" cy="66" r="6" fill="currentColor" />
          <circle cx="188" cy="66" r="17" fill="#050608" stroke="currentColor" strokeWidth="5" />
          <circle cx="188" cy="66" r="6" fill="currentColor" />
        </svg>
      </motion.div>
    </div>
  );
}
