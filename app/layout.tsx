import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import Sidebar from "@/components/dashboard/Sidebar";
import GridBackground from "@/components/ui/GridBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://futuregrid.genisisiq.com";
// basePath is set via NEXT_PUBLIC_BASE_PATH (e.g. "/FutureGrid" on GitHub Pages, "" otherwise).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const OG_IMAGE = {
  url: `${BASE_PATH}/og.png`,
  width: 1200,
  height: 630,
  alt: "FutureGrid — AI & the Future of Work",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FutureGrid — AI & the Future of Work",
    template: "%s · FutureGrid",
  },
  description:
    "Explore how artificial intelligence is reshaping careers — see AI exposure levels, Bright Outlook occupations, and salary data across 22 industry sectors.",
  openGraph: {
    siteName: "FutureGrid",
    type: "website",
    title: "FutureGrid — AI & the Future of Work",
    description:
      "Explore how artificial intelligence is reshaping careers — see AI exposure levels, Bright Outlook occupations, and salary data across 22 industry sectors.",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "FutureGrid — AI & the Future of Work",
    description:
      "Explore how artificial intelligence is reshaping careers — see AI exposure levels, Bright Outlook occupations, and salary data across 22 industry sectors.",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-[#07080d] text-zinc-200">
        <GoogleAnalytics />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <GridBackground />
        <Sidebar />
        {/* pt-16 on mobile offsets the fixed top bar; lg resets to lg:pt-0 via p-8 shorthand */}
        <main id="main" className="ml-0 lg:ml-60 min-h-full px-4 pb-4 pt-16 sm:px-6 sm:pb-6 sm:pt-16 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}