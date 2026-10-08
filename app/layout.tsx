import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";
import SiteFooter from "@/components/dashboard/SiteFooter";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { BASE_URL, BASE_PATH, SITE_DESCRIPTION } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  authors: [{ name: "Yingting Huang" }],
  creator: "Yingting Huang",
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "FutureGrid",
    type: "website",
    title: "FutureGrid — AI & the Future of Work",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "FutureGrid — AI & the Future of Work",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-[var(--bg)] text-[var(--text)]">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            <GoogleAnalytics />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
            >
              Skip to main content
            </a>
            <Sidebar />
            <div className="min-h-full lg:pl-60">
              <TopBar />
              {/* pt-14 on mobile offsets the fixed mobile header */}
              <main id="main" className="px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-8">
                <div className="mx-auto w-full max-w-[1440px]">
                  {children}
                  <SiteFooter />
                </div>
              </main>
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}