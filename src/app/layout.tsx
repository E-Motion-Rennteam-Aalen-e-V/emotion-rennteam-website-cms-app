import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MotionProvider from "@/components/MotionProvider";
import CookieConsent from "@/components/CookieConsent";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { getOrganizationJsonLdScript } from "@/lib/structuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "E-Motion Rennteam Aalen | Formula Student Electric",
    template: "%s | E-Motion Rennteam Aalen",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "E-Motion Rennteam Aalen | Formula Student Electric",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    url: SITE_URL,
    locale: "de_DE",
    type: "website",
    images: ["/uploads/ert-14-26-studio.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Motion Rennteam Aalen | Formula Student Electric",
    description: SITE_DESCRIPTION,
    images: ["/uploads/ert-14-26-studio.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: getOrganizationJsonLdScript() }}
        />
        <MotionProvider>{children}</MotionProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
