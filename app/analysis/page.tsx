import type { Metadata } from "next";
import InsightsView from "@/components/insights/InsightsView";

export const metadata: Metadata = {
  title: "Insights Lab",
};

export default function AnalysisPage() {
  return <InsightsView />;
}
