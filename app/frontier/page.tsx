import type { Metadata } from "next";
import AIFrontierView from "@/components/frontier/AIFrontierView";

export const metadata: Metadata = {
  title: "AI Frontier",
};

export default function FrontierPage() {
  return <AIFrontierView />;
}
