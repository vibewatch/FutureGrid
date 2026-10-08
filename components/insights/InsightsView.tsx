"use client";

import Reveal from "@/components/ui/Reveal";
import EvidenceConvergenceStrip from "@/components/insights/EvidenceConvergenceStrip";
import EvidenceStack from "@/components/insights/EvidenceStack";
import AIPressureSynthesisLens from "@/components/insights/AIPressureSynthesisLens";
import ExposureOutcomeMatrix from "@/components/insights/ExposureOutcomeMatrix";
import ExposureLensComparison from "@/components/insights/ExposureLensComparison";
import MarketSignalLens from "@/components/insights/MarketSignalLens";
import AICompanyStockLens from "@/components/insights/AICompanyStockLens";
import EmploymentForecastChart from "@/components/insights/EmploymentForecastChart";
import AIForcesTimeline from "@/components/insights/AIForcesTimeline";
import DisruptionLeaderboard from "@/components/insights/DisruptionLeaderboard";
import AdoptionTrackerLens, { type AdoptionTrackerLensProps } from "@/components/insights/AdoptionTrackerLens";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { useT } from "@/lib/i18n/useT";
import type { AnalysisPageData } from "@/lib/analysis";
import type { AIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";
import type { AICompanyStocksData } from "@/lib/ai-company-stocks";
import type { ExposureOutcomeMatrix as ExposureOutcomeMatrixData } from "@/lib/exposure-outcome";

function Section({ id, eyebrow, title, explainer, children }: { id?: string; eyebrow: string; title: string; explainer: string; children: React.ReactNode }) {
  return (
    <section id={id} className={id ? "scroll-mt-24" : undefined}>
      <SectionHeader eyebrow={eyebrow} title={title} description={explainer} />
      <div className="glass p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function InsightsView({ data, aiCompanyStocks, aiPressureSynthesis, exposureOutcomeMatrix, adoption }: { data: AnalysisPageData; aiCompanyStocks: AICompanyStocksData; aiPressureSynthesis: AIPressureSynthesisData; exposureOutcomeMatrix?: ExposureOutcomeMatrixData; adoption?: AdoptionTrackerLensProps }) {
  const t = useT("analysis");
  const ta = useT("adoption");
  return (
    <div className="space-y-12">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageSubhead")}
        meta={
          <p className="flex max-w-4xl gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400" role="note">
            <span aria-hidden="true" className="mt-px shrink-0 text-zinc-400">ℹ</span>
            {t("framingNote")}
          </p>
        }
      />
      <AIPressureSynthesisLens data={aiPressureSynthesis} />
      {adoption && (
        <>
          <hr className="divider-glow" />
          <Section id="measured-adoption" eyebrow={ta("kicker")} title={ta("lensTitle")} explainer={ta("lensExplainer")}>
            <AdoptionTrackerLens {...adoption} />
          </Section>
        </>
      )}
      <hr className="divider-glow" />
      <Reveal>
        <EvidenceConvergenceStrip />
      </Reveal>
      <hr className="divider-glow" />
      <Reveal>
        <EvidenceStack />
      </Reveal>
      <hr className="divider-glow" />
      {exposureOutcomeMatrix && (
        <>
          <Section eyebrow="01" title={t("matrixTitle")} explainer={t("matrixExplainer")}><ExposureOutcomeMatrix matrix={exposureOutcomeMatrix} /></Section>
          <hr className="divider-glow" />
        </>
      )}
      <Section eyebrow={exposureOutcomeMatrix ? "02" : "01"} title={t("exposureLensesTitle")} explainer={t("exposureLensesExplainer")}><ExposureLensComparison comparison={data.exposureComparison} leaders={data.exposureGapLeaders} /></Section>
      <hr className="divider-glow" />
      <Section id="market-ai-sensitivity" eyebrow="03" title={t("marketSignalTitle")} explainer={t("marketSignalExplainer")}><MarketSignalLens /></Section>
      <hr className="divider-glow" />
      <Section id="ai-company-stock-signals" eyebrow="04" title={t("aiCompanyStockTitle")} explainer={t("aiCompanyStockExplainer")}><AICompanyStockLens data={aiCompanyStocks} /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="05" title={t("forecastTitle")} explainer={t("forecastExplainer")}><EmploymentForecastChart national={data.nationalForecast} signalPoints={data.aiSignal.points} forecasts={data.forecasts} /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="06" title={t("aiForcesTitle")} explainer={t("aiForcesExplainer")}><AIForcesTimeline /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="07" title={t("disruptionTitle")} explainer={t("disruptionExplainer")}><DisruptionLeaderboard index={data.disruptionIndex} /></Section>
    </div>
  );
}
