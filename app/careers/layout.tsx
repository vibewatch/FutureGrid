import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers — AI Exposure by Occupation",
  description:
    "Browse hundreds of occupations ranked by AI exposure, automation risk, and salary. Filter by sector, risk level, and Bright Outlook status.",
  openGraph: {
    title: "Careers — AI Exposure by Occupation",
    description:
      "Browse hundreds of occupations ranked by AI exposure, automation risk, and salary. Filter by sector, risk level, and Bright Outlook status.",
  },
  twitter: {
    title: "Careers — AI Exposure by Occupation",
    description:
      "Browse hundreds of occupations ranked by AI exposure, automation risk, and salary. Filter by sector, risk level, and Bright Outlook status.",
  },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
