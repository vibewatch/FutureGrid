import LaborMarketView from "@/components/labor/LaborMarketView";
import { getLaborOpportunityData } from "@/lib/labor-opportunity";

export default function LaborPage() {
  return <LaborMarketView opportunityData={getLaborOpportunityData()} />;
}
