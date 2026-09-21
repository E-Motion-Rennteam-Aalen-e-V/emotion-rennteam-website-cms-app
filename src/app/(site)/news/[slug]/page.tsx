import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsBySlug } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import Reveal from "@/components/motion/Reveal";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getNewsBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt ?? post.title,
    alternates: { canonical: `/news/${slug}` },
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getNewsBySlug(slug);
  if (!post) notFound();

  const bodyHtml = await renderMarkdown(post.body);

  return (
    <div className="container-page py-20">
      <Reveal className="mx-auto max-w-2xl">
        <Link href="/news" className="text-sm font-semibold text-accent-text hover:underline">
          &larr; Zurück zu den News
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-accent-text">
          {formatDate(post.date)}
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">{post.title}</h1>

        {post.coverImage && (
          <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-xl">
            <Image src={post.coverImage} alt="" fill sizes="(min-width: 1024px) 768px, 100vw" className="object-cover" />
          </div>
        )}

        <div
          className="prose prose-sm mt-8 max-w-none text-sm leading-relaxed text-muted [&_a]:text-accent-text [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_p]:mt-4"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </Reveal>
    </div>
  );
}
