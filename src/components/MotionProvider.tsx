"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps the app in a single MotionConfig so every framer-motion animation
 * respects the user's `prefers-reduced-motion` setting automatically
 * (reducedMotion="user"), without having to thread that logic through each
 * individual motion component.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}
