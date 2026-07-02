import ExploreView from "@/components/explore/ExploreView";
import { getEmploymentHistoryMap } from "@/lib/snapshot";

export default function ExplorePage() {
  // Read the full snapshot's employment history at BUILD time and hand the
  // bar-chart-race only the map it needs, keeping the full snapshot out of
  // client JS chunks.
  const employmentHistories = getEmploymentHistoryMap();
  return <ExploreView employmentHistories={employmentHistories} />;
}
