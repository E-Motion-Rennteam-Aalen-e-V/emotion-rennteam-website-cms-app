"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";
import type { TeamMember } from "@/lib/content";

export default function TeamByGeneration({
  team,
  departments,
  departmentImages,
  descriptions,
}: {
  team: TeamMember[];
  departments: readonly string[];
  departmentImages: Record<string, string>;
  descriptions: Record<string, string>;
}) {
  const generations = Array.from(new Set(team.map((m) => m.generation))).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true })
  );
  const [selected, setSelected] = useState(generations[0]);
  const activeGeneration = generations.includes(selected) ? selected : generations[0];
  const generationTeam = team.filter((m) => m.generation === activeGeneration);

  return (
    <>
      {generations.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {generations.map((generation) => (
            <button
              key={generation}
              type="button"
              onClick={() => setSelected(generation)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                generation === activeGeneration
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {generation}
            </button>
          ))}
        </div>
      )}

      <div className="mt-14 space-y-14">
        {departments.map((department, di) => {
          const members = generationTeam.filter(
            (member) => member.department === department || (!member.department && di === 0)
          );
          const banner = departmentImages[department];
          return (
            <Reveal key={`${activeGeneration}-${department}`} delay={di * 0.03}>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface/50">
                {banner && (
                  <div className="relative h-64 w-full overflow-hidden sm:h-80">
                    <Image
                      src={banner}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="(min-width: 1024px) 1024px, 100vw"
                      className="scale-110 object-cover object-top blur-2xl brightness-50"
                    />
                    <Image
                      src={banner}
                      alt={`Team ${department}`}
                      fill
                      sizes="(min-width: 1024px) 1024px, 100vw"
                      className="object-contain"
                      priority={di === 0}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-6 sm:p-8">
                      <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{department}</h2>
                    </div>
                  </div>
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                    <div>
                      {!banner && <h2 className="text-xl font-bold">{department}</h2>}
                      {descriptions[department] && (
                        <p className="mt-1.5 max-w-xl text-sm text-muted">{descriptions[department]}</p>
                      )}
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-text">
                      {members.length} {members.length === 1 ? "Mitglied" : "Mitglieder"}
                    </span>
                  </div>

                  {members.length === 0 ? (
                    <p className="mt-6 text-sm text-muted">
                      {activeGeneration === generations[0] ? (
                        <>
                          Team wird noch aufgebaut –{" "}
                          <a href="/mitmachen" className="text-accent-text underline">
                            hier mitmachen
                          </a>
                          .
                        </>
                      ) : (
                        "Für diesen Jahrgang sind keine Mitglieder hinterlegt."
                      )}
                    </p>
                  ) : (
                    <StaggerGroup className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {members.map((member) => (
                        <StaggerItem key={member.slug}>
                          <div className="group h-full rounded-xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_0_30px_-10px_rgba(0,113,181,0.35)]">
                            <div className="aspect-square overflow-hidden rounded-lg bg-surface-2">
                              {member.photo ? (
                                <Image
                                  src={member.photo}
                                  alt={member.name}
                                  width={300}
                                  height={300}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="h-9 w-9 opacity-50"
                                  >
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                                  </svg>
                                  <span className="text-xs font-medium uppercase tracking-wide">Bild folgt</span>
                                </div>
                              )}
                            </div>
                            <h3 className="mt-4 font-semibold">{member.name}</h3>
                            <p className="text-sm text-accent-text">{member.role}</p>
                            {member.body && <p className="mt-2 text-sm text-muted">{member.body}</p>}
                          </div>
                        </StaggerItem>
                      ))}
                    </StaggerGroup>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
