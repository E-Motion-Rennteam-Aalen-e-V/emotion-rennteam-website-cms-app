"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type Direction = "up" | "left" | "right" | "none";

const DISTANCE = 32;

function getVariants(direction: Direction): Variants {
  const offset =
    direction === "up"
      ? { y: DISTANCE }
      : direction === "left"
        ? { x: -DISTANCE }
        : direction === "right"
          ? { x: DISTANCE }
          : {};

  return {
    hidden: { opacity: 0, ...offset },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };
}

export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  className,
  once = true,
  id,
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
  once?: boolean;
  id?: string;
}) {
  return (
    <motion.div
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.2 }}
      variants={getVariants(direction)}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
