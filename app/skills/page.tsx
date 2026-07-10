import { generateAllCareerInsights } from "@/lib/data";
import { getReskillingBridgeData } from "@/lib/reskilling-bridge";
import SkillsPageClient from "@/components/skills/SkillsPageClient";

// Server Component: heavy data imports stay server-side; only serializable
// derived payloads cross the RSC boundary to SkillsPageClient.
export default function SkillsPage() {
  const bridgeData = getReskillingBridgeData();
  const allInsights = generateAllCareerInsights();
  return <SkillsPageClient bridgeData={bridgeData} allInsights={allInsights} />;
}
