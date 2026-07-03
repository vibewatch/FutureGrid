import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Labor Market — FutureGrid",
  description:
    "Explore US labor turnover trends, employment opportunity projections, and layoff notices in one BLS-focused view.",
  openGraph: {
    title: "Labor Market — FutureGrid",
    description:
      "Turnover trends, employment opportunity projections, and WARN layoff notices in one labor-market view.",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
  },
  twitter: {
    title: "Labor Market — FutureGrid",
    description:
      "Explore turnover trends, opportunity projections, and layoff notices in one tabbed labor-market view.",
  },
};

export default function LaborLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
