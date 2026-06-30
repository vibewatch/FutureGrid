import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data & Sources",
  description:
    "FutureGrid uses current, authoritative datasets. Full transparency on every data source, license, and methodology.",
  openGraph: {
    title: "Data & Sources",
    description:
      "FutureGrid uses current, authoritative datasets. Full transparency on every data source, license, and methodology.",
  },
  twitter: {
    title: "Data & Sources",
    description:
      "FutureGrid uses current, authoritative datasets. Full transparency on every data source, license, and methodology.",
  },
};

export default function SourcesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
