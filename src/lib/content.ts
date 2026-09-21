import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { DEFAULT_GENERATION } from "@/lib/team-departments";

const CONTENT_DIR = path.join(process.cwd(), "content");

// Eine einzelne beschaedigte Markdown-Datei (kaputtes YAML-Frontmatter,
// liegengebliebene Git-Konflikt-Marker, halber Schreibvorgang) darf nie die
// gesamte Collection - und damit die Live-Seite fuer alle Besucher - zum
// Absturz bringen. Defekte Eintraege werden uebersprungen und geloggt statt
// den Fehler weiterzuwerfen.
function readCollection<T>(collection: string): (T & { slug: string })[] {
  const dir = path.join(CONTENT_DIR, collection);
  if (!fs.existsSync(dir)) return [];

  const items: (T & { slug: string; body: string })[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      items.push({
        ...(data as T),
        slug: file.replace(/\.md$/, ""),
        body: content,
      } as T & { slug: string; body: string });
    } catch (error) {
      console.error(`[content] Ueberspringe defekte Datei ${collection}/${file}:`, error);
    }
  }
  return items;
}

export { TEAM_DEPARTMENTS, DEFAULT_GENERATION } from "@/lib/team-departments";

export type TeamMember = {
  name: string;
  role: string;
  department: string;
  generation: string;
  order?: number;
  photo?: string;
  linkedin?: string;
  body: string;
  slug: string;
};

export type Vehicle = {
  name: string;
  year: number;
  tagline?: string;
  coverImage?: string;
  current?: boolean;
  specs?: { label: string; value: string }[];
  achievements?: string[];
  body: string;
  slug: string;
};

export type Sponsor = {
  name: string;
  tier: "Platin" | "Gold" | "Silber" | "Partner";
  logo?: string;
  website?: string;
  body: string;
  slug: string;
};

export type NewsPost = {
  title: string;
  date: string;
  excerpt?: string;
  coverImage?: string;
  body: string;
  slug: string;
};

export type Page = {
  title: string;
  heroTitle?: string;
  heroSubtitle?: string;
  stats?: { label: string; value: string }[];
  departmentDescriptions?: { label: string; value: string }[];
  address?: string;
  email?: string;
  phone?: string;
  socialMedia?: string;
  body: string;
  slug: string;
};

export type BlogPost = {
  title: string;
  date: string;
  author?: string;
  excerpt?: string;
  coverImage?: string;
  body: string;
  slug: string;
};

export type GalleryImage = {
  title: string;
  image: string;
  album: string;
  order?: number;
  slug: string;
};

export type Result = {
  title: string;
  year: number;
  event: string;
  placement?: string;
  description?: string;
  slug: string;
};

export type Position = {
  title: string;
  department?: string;
  commitment?: string;
  body: string;
  slug: string;
};

export type NavItem = {
  label: string;
  href: string;
  group: "Hauptmenü" | "Aktuelles-Dropdown";
  order?: number;
  visible?: boolean;
  slug: string;
};

export function getTeam(): TeamMember[] {
  return readCollection<TeamMember>("team")
    .map((member) => ({ ...member, generation: member.generation || DEFAULT_GENERATION }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getVehicles(): Vehicle[] {
  return readCollection<Vehicle>("vehicles").sort((a, b) => b.year - a.year);
}

export function getSponsors(): Sponsor[] {
  const tierOrder = ["Platin", "Gold", "Silber", "Partner"];
  return readCollection<Sponsor>("sponsors").sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );
}

export function getNews(): NewsPost[] {
  return readCollection<NewsPost>("news").sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getNewsBySlug(slug: string): NewsPost | undefined {
  return getNews().find((post) => post.slug === slug);
}

export function getPage(slug: string): Page | undefined {
  return readCollection<Page>("pages").find((page) => page.slug === slug);
}

export function getBlogPosts(): BlogPost[] {
  return readCollection<BlogPost>("blog").sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug);
}

const GALLERY_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "galerie-upload");
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function getAutoGalleryImages(): GalleryImage[] {
  if (!fs.existsSync(GALLERY_UPLOAD_DIR)) return [];

  return fs
    .readdirSync(GALLERY_UPLOAD_DIR)
    .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .map((file) => {
      const title = path
        .basename(file, path.extname(file))
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^./, (c) => c.toUpperCase());
      return {
        title: title || "Foto",
        image: `/uploads/galerie-upload/${file}`,
        album: "Weitere Bilder",
        slug: `auto-${file}`,
      };
    });
}

export function getGallery(): GalleryImage[] {
  const curated = readCollection<GalleryImage>("gallery").sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99)
  );
  return [...curated, ...getAutoGalleryImages()];
}

export function getResults(): Result[] {
  return readCollection<Result>("results").sort((a, b) => b.year - a.year);
}

export function getPositions(): Position[] {
  return readCollection<Position>("positions");
}

// `visible` defaults to true when the frontmatter field is absent, so
// existing/manually-added nav items without the flag still show up.
export function getNavItems(): NavItem[] {
  return readCollection<NavItem>("nav-items")
    .filter((item) => item.visible !== false)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
