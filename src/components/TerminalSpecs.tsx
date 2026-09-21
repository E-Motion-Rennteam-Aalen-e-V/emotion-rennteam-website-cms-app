"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import type { Vehicle } from "@/lib/content";

const TYPE_SPEED_MS = 18;
const LINE_PAUSE_MS = 260;
const ACHIEVEMENT_PAUSE_MS = 140;
const START_DELAY_MS = 350;

type Segment = {
  text: string;
  kind: "command" | "output";
  pauseAfter: number;
};

export default function TerminalSpecs({
  specs,
  achievements,
}: {
  specs: NonNullable<Vehicle["specs"]>;
  achievements?: Vehicle["achievements"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);

  // The whole terminal session — specs output, then the history command and
  // each achievement line — is one continuous typed sequence, so every line
  // appears on its own like real shell output instead of fading in at once.
  const segments = useMemo<Segment[]>(() => {
    const list: Segment[] = specs.map((s) => ({
      text: `${s.label}: ${s.value}`,
      kind: "output",
      pauseAfter: LINE_PAUSE_MS,
    }));
    if (achievements && achievements.length > 0) {
      list.push({ text: "./erfolge.sh --history", kind: "command", pauseAfter: LINE_PAUSE_MS });
      achievements.forEach((achievement, i) => {
        list.push({
          text: `[✓] ${achievement}`,
          kind: "output",
          pauseAfter: i === achievements.length - 1 ? 0 : ACHIEVEMENT_PAUSE_MS,
        });
      });
    }
    return list;
  }, [specs, achievements]);

  const done = reduceMotion || segmentIndex >= segments.length;

  useEffect(() => {
    if (!inView || reduceMotion) return;
    let cancelled = false;
    let seg = 0;
    let chars = 0;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      if (cancelled) return;
      if (seg >= segments.length) return;
      const current = segments[seg];
      chars += 1;
      setSegmentIndex(seg);
      setVisibleChars(chars);
      if (chars < current.text.length) {
        timer = setTimeout(tick, TYPE_SPEED_MS);
        return;
      }
      seg += 1;
      chars = 0;
      setSegmentIndex(seg);
      if (seg < segments.length) {
        timer = setTimeout(tick, current.pauseAfter || TYPE_SPEED_MS);
      }
    }

    timer = setTimeout(tick, START_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inView, reduceMotion, segments]);

  return (
    <div
      ref={ref}
      className="mt-6 overflow-hidden rounded-xl border border-border bg-[#0a0c12] shadow-[0_0_40px_-15px_rgba(0,113,181,0.35)]"
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-surface-2 px-4 py-2.5">
        <span aria-hidden="true" className="font-mono text-sm text-accent-text">{">"}_</span>
        <span className="font-mono text-xs text-muted">technische-daten.sh</span>
      </div>
      <div className="p-5 font-mono text-sm leading-relaxed">
        <p className="text-muted">
          <span className="text-accent-text">ert@emotion</span>
          <span className="text-muted">:~$</span> cat technische-daten.txt
        </p>

        {segments.map((segment, i) => {
          if (!reduceMotion && i > segmentIndex) return null;
          const isTyping = !reduceMotion && i === segmentIndex && !done;
          const text = isTyping ? segment.text.slice(0, visibleChars) : segment.text;
          const cursor = isTyping && (
            <span
              aria-hidden="true"
              className="terminal-cursor ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-accent-text align-middle"
            />
          );

          if (segment.kind === "command") {
            return (
              <p key={i} className="mt-4 text-muted">
                <span className="text-accent-text">ert@emotion</span>
                <span className="text-muted">:~$</span> {text}
                {cursor}
              </p>
            );
          }

          return (
            <p
              key={i}
              className={`mt-1 whitespace-pre-wrap break-words ${
                segment.text.startsWith("[✓]") ? "text-accent-2-text" : "text-accent-text"
              }`}
            >
              {text}
              {cursor}
            </p>
          );
        })}
      </div>
    </div>
  );
}
