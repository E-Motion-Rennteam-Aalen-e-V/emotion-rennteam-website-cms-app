"use client";

import { motion } from "framer-motion";

export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,113,181,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,113,181,0.06)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black_40%,transparent_100%)]" />

      <motion.div
        className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-accent/20 blur-[100px]"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-20 h-[28rem] w-[28rem] rounded-full bg-accent-2/15 blur-[120px]"
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,113,181,0.12),transparent_45%)]" />
    </div>
  );
}
