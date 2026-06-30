import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Heatmap — AI Risk Across Sectors & Roles",
  description:
    "Visual heatmap of AI exposure across all sectors and occupations. Instantly spot which roles and industries face the highest disruption risk.",
  openGraph: {
    title: "Heatmap — AI Risk Across Sectors & Roles",
    description:
      "Visual heatmap of AI exposure across all sectors and occupations. Instantly spot which roles and industries face the highest disruption risk.",
  },
  twitter: {
    title: "Heatmap — AI Risk Across Sectors & Roles",
    description:
      "Visual heatmap of AI exposure across all sectors and occupations. Instantly spot which roles and industries face the highest disruption risk.",
  },
};

export default function HeatmapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
