import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sectors — AI Impact by Industry",
  description:
    "Analyse AI disruption across 22 industry sectors. Compare job impact scores, career trend projections, and employment data side-by-side.",
  openGraph: {
    title: "Sectors — AI Impact by Industry",
    description:
      "Analyse AI disruption across 22 industry sectors. Compare job impact scores, career trend projections, and employment data side-by-side.",
  },
  twitter: {
    title: "Sectors — AI Impact by Industry",
    description:
      "Analyse AI disruption across 22 industry sectors. Compare job impact scores, career trend projections, and employment data side-by-side.",
  },
};

export default function SectorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
