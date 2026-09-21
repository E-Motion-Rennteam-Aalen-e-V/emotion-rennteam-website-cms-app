import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
};

// Catches unmatched paths that don't resolve into the (site) route group
// (which has its own not-found.tsx rendered inside its Header/Footer
// layout) — this one renders outside any nested layout, so it brings its
// own chrome to stay visually consistent with the rest of the site.
export default function RootNotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        <NotFoundContent />
      </main>
      <Footer />
    </>
  );
}
