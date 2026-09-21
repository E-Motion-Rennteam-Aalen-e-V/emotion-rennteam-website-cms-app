import type { Metadata } from "next";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
};

export default function NotFound() {
  return <NotFoundContent />;
}
