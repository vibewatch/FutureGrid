import { getSectorAggregatesExtended } from "@/lib/data";
import { getWageTierPolarization } from "@/lib/wage-tier-polarization";
import SectorsPageClient from "@/components/sectors/SectorsPageClient";

// Server Component: computes wage-tier data and sector aggregates at build time.
// Heavy occupation-snapshot.json stays server-only — never enters the /sectors client chunk.
export default function SectorsPage() {
  const allSectors = getSectorAggregatesExtended();
  const wageTierData = getWageTierPolarization();
  return <SectorsPageClient allSectors={allSectors} wageTierData={wageTierData} />;
}
