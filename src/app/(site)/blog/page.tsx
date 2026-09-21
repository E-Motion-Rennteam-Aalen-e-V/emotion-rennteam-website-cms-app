import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getBlogPosts } from "@/lib/content";
import Reveal from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/Stagger";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Der Blog des E-Motion Rennteams Aalen: Einblicke in Werkstatt, Teamalltag und die Entwicklung unserer Formula-Student-Fahrzeuge.",
  alternates: { canonical: "/blog" },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <div className="container-page py-20">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent-text">Blog</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl">
          Einblicke aus dem Team
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          Geschichten aus der Werkstatt, dem Teamalltag und der Entwicklung unserer Fahrzeuge –
          direkt aus erster Hand.
        </p>
      </Reveal>

      {posts.length === 0 ? (
        <p className="mt-14 text-muted">Es sind noch keine Beiträge vorhanden.</p>
      ) : (
        <StaggerGroup className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <StaggerItem key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent/50"
              >
                {post.coverImage && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent-text">
                    {formatDate(post.date)}
                    {post.author ? ` · ${post.author}` : ""}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-2 flex-1 text-sm text-muted">{post.excerpt}</p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-text transition-all group-hover:gap-2">
                    Weiterlesen <span aria-hidden>&rarr;</span>
                  </span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </div>
  );
}
