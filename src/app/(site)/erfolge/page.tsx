import type { Metadata } from "next";
import { getResults, getPage } from "@/lib/content";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Timeline",
  description:
    "Die Timeline des E-Motion Rennteams Aalen: Platzierungen, Events und Meilensteine der Teamgeschichte im Überblick.",
  alternates: { canonical: "/erfolge" },
};

export default function ResultsPage() {
  const results = getResults();
  const page = getPage("results");

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Timeline</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl">
          {page?.heroTitle ?? "Unsere Historie"}
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          {page?.heroSubtitle ??
            "Von der Teamgründung bis zu unseren besten Wettbewerbsergebnissen – eine Zeitreise durch die Geschichte des E-Motion Rennteams. Seit 2012 sind wir bei internationalen Formula-Student-Events angetreten und landeten dabei immer wieder in den Top 5 einzelner Disziplinen und in der Gesamtwertung unter den besten 10 Teams."}
        </p>
      </Reveal>

      <div className="relative mt-16">
        <div className="absolute left-4 top-0 h-full w-px bg-border sm:left-1/2" />

        <div className="space-y-12">
          {results.map((result, i) => (
            <Reveal
              key={result.slug}
              direction={i % 2 === 0 ? "left" : "right"}
              className={`relative flex flex-col gap-4 sm:flex-row sm:items-center ${
                i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
              }`}
            >
              <div className="absolute left-4 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-accent bg-background sm:left-1/2" />

              <div
                className={`w-full pl-10 sm:w-1/2 sm:pl-0 ${
                  i % 2 === 0 ? "sm:pr-12 sm:text-right" : "sm:pl-12 sm:text-left"
                }`}
              >
                <div className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent/50">
                  <span className="text-sm font-semibold uppercase tracking-widest text-accent-text">
                    {result.year}
                  </span>
                  <h2 className="mt-1 text-xl font-bold">{result.title}</h2>
                  <p className="mt-1 text-sm text-muted">{result.event}</p>
                  {result.placement && (
                    <span className="mt-3 inline-block rounded-full bg-accent-2/15 px-3 py-1 text-xs font-semibold text-accent-2-text">
                      {result.placement}
                    </span>
                  )}
                  {result.description && (
                    <p className="mt-3 text-sm text-muted">{result.description}</p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
