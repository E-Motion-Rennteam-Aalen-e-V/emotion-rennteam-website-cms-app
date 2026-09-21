import type { Metadata } from "next";
import { getPage } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung des E-Motion Rennteams Aalen: Informationen zur Verarbeitung personenbezogener Daten auf dieser Website.",
  alternates: { canonical: "/datenschutz" },
};

export default async function DatenschutzPage() {
  const page = getPage("datenschutz");
  const bodyHtml = page?.body ? await renderMarkdown(page.body) : "";

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Rechtliches</p>
        <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
          {page?.heroTitle ?? "Datenschutzerklärung"}
        </h1>
      </Reveal>

      <Reveal delay={0.05} className="mt-12 max-w-2xl">
        <div
          className="prose prose-sm text-sm leading-relaxed text-muted [&_a]:text-accent-text [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-2"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </Reveal>
    </div>
  );
}
