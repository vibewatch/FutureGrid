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
import { useT } from "@/lib/i18n/useT";
import type { AnalysisPageData } from "@/lib/analysis";
import type { AIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";
import type { AICompanyStocksData } from "@/lib/ai-company-stocks";
import type { ExposureOutcomeMatrix as ExposureOutcomeMatrixData } from "@/lib/exposure-outcome";

function Section({ id, eyebrow, title, explainer, children }: { id?: string; eyebrow: string; title: string; explainer: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section id={id} className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold text-gradient">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{explainer}</p>
        </div>
        <div className="glass p-5 sm:p-6 xl:p-8">{children}</div>
      </section>
    </Reveal>
  );
}

export default function InsightsView({ data, aiCompanyStocks, aiPressureSynthesis, exposureOutcomeMatrix }: { data: AnalysisPageData; aiCompanyStocks: AICompanyStocksData; aiPressureSynthesis: AIPressureSynthesisData; exposureOutcomeMatrix?: ExposureOutcomeMatrixData }) {
  const t = useT("analysis");
  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-14 xl:space-y-16">
      <section className="pt-4 pb-2">
        <Reveal>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">{t("pageTitle")}</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">{t("pageSubhead")}</p>
        </Reveal>
        <Reveal delay={120} className="mt-6">
          <div className="glass flex max-w-5xl gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400" role="note">
            <span aria-hidden="true" className="mt-px shrink-0 text-zinc-500">ℹ</span>
            <p>{t("framingNote")}</p>
          </div>
        </Reveal>
      </section>

      <hr className="divider-glow" />
      <AIPressureSynthesisLens data={aiPressureSynthesis} />
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
