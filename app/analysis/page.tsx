import type { Metadata } from "next";
import InsightsView from "@/components/insights/InsightsView";
import { getAnalysisPageData } from "@/lib/analysis";

export const metadata: Metadata = {
  title: "Insights Lab",
};

export default function AnalysisPage() {
  // Compute the analysis datasets at BUILD time on the server so the full
  // occupation snapshot (needed for the history-based forecasts) stays out of
  // the client bundle. Only the resolved results are handed to the islands.
  const data = getAnalysisPageData();
  return <InsightsView data={data} />;
}
