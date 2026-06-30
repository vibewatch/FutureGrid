import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  title: "FutureGrid — AI & the Future of Work",
  description:
    "Explore how artificial intelligence is reshaping careers, automation risk, and growth opportunities across 22 industry sectors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-[#07080d] text-zinc-200">
        <GridBackground />
        <Sidebar />
        {/* pt-16 on mobile offsets the fixed top bar; lg resets to lg:pt-0 via p-8 shorthand */}
        <main className="ml-0 lg:ml-60 min-h-full px-4 pb-4 pt-16 sm:px-6 sm:pb-6 sm:pt-16 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}