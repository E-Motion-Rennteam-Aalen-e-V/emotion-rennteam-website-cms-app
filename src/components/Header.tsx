import { getNavItems } from "@/lib/content";
import HeaderNav from "@/components/HeaderNav";

// Falls back to the original hardcoded links when no "navItem" entries exist
// yet (e.g. before the CMS collection has been seeded), so the header never
// renders empty.
const DEFAULT_MAIN_LINKS = [
  { href: "/team", label: "Team" },
  { href: "/fahrzeuge", label: "Fahrzeuge" },
  { href: "/sponsoren", label: "Sponsoren" },
];

const DEFAULT_MORE_LINKS = [
  { href: "/formula-student", label: "Formula Student" },
  { href: "/galerie", label: "Galerie" },
  { href: "/erfolge", label: "Timeline" },
  { href: "/news", label: "News" },
  { href: "/blog", label: "Blog" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function Header() {
  const navItems = getNavItems();
  const mainLinks = navItems.length
    ? navItems.filter((item) => item.group === "Hauptmenü").map((item) => ({ href: item.href, label: item.label }))
    : DEFAULT_MAIN_LINKS;
  const moreLinks = navItems.length
    ? navItems.filter((item) => item.group === "Aktuelles-Dropdown").map((item) => ({ href: item.href, label: item.label }))
    : DEFAULT_MORE_LINKS;

  return <HeaderNav mainLinks={mainLinks} moreLinks={moreLinks} />;
}
