import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global AI Adoption",
  description:
    "Per-country AI (Claude.ai) usage from the Anthropic Economic Index. See which nations lead in real-world AI adoption and explore global diffusion trends.",
  openGraph: {
    title: "Global AI Adoption",
    description:
      "Per-country AI (Claude.ai) usage from the Anthropic Economic Index. See which nations lead in real-world AI adoption and explore global diffusion trends.",
  },
  twitter: {
    title: "Global AI Adoption",
    description:
      "Per-country AI (Claude.ai) usage from the Anthropic Economic Index. See which nations lead in real-world AI adoption and explore global diffusion trends.",
  },
};

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
