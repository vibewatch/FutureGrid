import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent Mass Layoffs — FutureGrid",
  description:
    "California WARN Act mass-layoff notices: 1,500+ filings, 80,000+ employees affected. " +
    "Official data from the California Employment Development Department (EDD).",
  openGraph: {
    title: "Recent Mass Layoffs — FutureGrid",
    description:
      "Visualizing California EDD WARN Act filings — government mass-layoff notices for the largest U.S. state.",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
  },
  twitter: {
    title: "Recent Mass Layoffs — FutureGrid",
    description:
      "California WARN Act mass-layoff notices visualized: trends, top employers, and searchable directory.",
  },
};

export default function LayoffsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
