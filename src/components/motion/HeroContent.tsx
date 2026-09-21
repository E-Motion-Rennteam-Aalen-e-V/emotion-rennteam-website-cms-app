"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HeroContent({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container}
      className="mx-auto max-w-4xl text-center"
    >
      <motion.p
        variants={item}
        className="mb-5 text-sm font-semibold uppercase tracking-widest text-accent-text"
      >
        {eyebrow}
      </motion.p>
      <motion.h1
        variants={item}
        className="mx-auto text-6xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl lg:text-8xl"
      >
        <span className="text-gradient-accent">{title}</span>
      </motion.h1>
      <motion.p variants={item} className="mx-auto mt-7 max-w-2xl text-xl text-muted">
        {subtitle}
      </motion.p>
      <motion.div variants={item} className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/mitmachen"
          className="group relative overflow-hidden rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-105"
        >
          <span className="relative z-10">Jetzt mitmachen</span>
        </Link>
        <Link
          href="/fahrzeuge"
          className="rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:bg-surface"
        >
          Unser Fahrzeug entdecken
        </Link>
        <Link
          href="/sponsoren#werden"
          className="rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:bg-surface"
        >
          Sponsor werden
        </Link>
      </motion.div>
    </motion.div>
  );
}
