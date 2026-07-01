import DashboardHome from "@/components/dashboard/DashboardHome";
import { generateAllCareerInsights, getSectorAggregatesExtended, getTotalWorkforce, getWorkforceExposure } from "@/lib/data";

export default function HomePage() {
  const insights = generateAllCareerInsights();
  const sectors = getSectorAggregatesExtended();
  const totalWorkforce = getTotalWorkforce();
  const workforceExposure = getWorkforceExposure();
  const highRiskCount = insights.filter(
    (i) => i.automationRisk === "High" || i.automationRisk === "Very High"
  ).length;
  const lowRiskCount = insights.filter((i) => i.automationRisk === "Low").length;
  const avgRiskAll =
    insights.length > 0
      ? insights.reduce((s, i) => s + i.automationProbability, 0) / insights.length
      : 0;

  return (
    <DashboardHome
      insightsLength={insights.length}
      totalWorkforce={totalWorkforce}
      sectors={sectors.slice(0, 6).map((s) => ({
        sector: s.sector,
        avgRisk: s.avgRisk,
        occupationCount: s.occupationCount,
        brightShare: s.brightShare,
      }))}
      highRiskCount={highRiskCount}
      lowRiskCount={lowRiskCount}
      avgRiskAll={avgRiskAll}
      workforceExposure={{
        highExposureShare: workforceExposure.highExposureShare,
        highExposureWorkforce: workforceExposure.highExposureWorkforce,
        totalWorkforce: workforceExposure.totalWorkforce,
      }}
    />
  );
}
