import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Future of Work — FutureGrid",
  description:
    "A scrollytelling narrative on how AI is reshaping employment across every sector. Explore exposure data, sector maps, and reskilling pathways.",
  openGraph: {
    title: "The Future of Work — FutureGrid",
    description:
      "A data-driven narrative on how AI is reshaping employment across every sector of the economy.",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
  },
  twitter: {
    title: "The Future of Work — FutureGrid",
    description:
      "A scrollytelling narrative on how AI is reshaping employment across every sector.",
  },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
