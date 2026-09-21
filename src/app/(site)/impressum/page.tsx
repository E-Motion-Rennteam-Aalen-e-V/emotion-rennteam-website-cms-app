import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import Reveal from "@/components/motion/Reveal";
import HumanCreatedBadge from "@/components/HumanCreatedBadge";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung des E-Motion Rennteams Aalen gemäß § 5 TMG.",
  alternates: { canonical: "/impressum" },
};

export default async function ImpressumPage() {
  const page = getPage("impressum");
  const bodyHtml = page?.body ? await renderMarkdown(page.body) : "";

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Rechtliches</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
          {page?.heroTitle ?? "Impressum"}
        </h1>
      </Reveal>

      <Reveal delay={0.05} className="mt-12 max-w-2xl">
        <div
          className="prose prose-sm text-sm leading-relaxed text-muted [&_a]:text-accent-text [&_a]:underline [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-2"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </Reveal>

      <Reveal delay={0.08} className="mt-12 flex flex-col items-center text-center">
        <HumanCreatedBadge className="h-24 w-24 text-muted" />
        <p className="mt-3 max-w-xs text-xs text-muted">
          Die Inhalte dieser Website werden von Menschen des E-Motion Rennteams Aalen erstellt.
        </p>
      </Reveal>
    </div>
  );
}
