import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skills — AI-Resistant Skill Transitions",
  description:
    "Identify transferable, AI-resistant skills and find smart career pivots based on occupation skill profiles and AI exposure data.",
  openGraph: {
    title: "Skills — AI-Resistant Skill Transitions",
    description:
      "Identify transferable, AI-resistant skills and find smart career pivots based on occupation skill profiles and AI exposure data.",
  },
  twitter: {
    title: "Skills — AI-Resistant Skill Transitions",
    description:
      "Identify transferable, AI-resistant skills and find smart career pivots based on occupation skill profiles and AI exposure data.",
  },
};

export default function SkillsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
