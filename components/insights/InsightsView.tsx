"use client";

import Reveal from "@/components/ui/Reveal";
import EvidenceStack from "@/components/insights/EvidenceStack";
import AISignalScatter from "@/components/insights/AISignalScatter";
import ExposureLensComparison from "@/components/insights/ExposureLensComparison";
import MarketSignalLens from "@/components/insights/MarketSignalLens";
import EmploymentForecastChart from "@/components/insights/EmploymentForecastChart";
import AIForcesTimeline from "@/components/insights/AIForcesTimeline";
import DisruptionLeaderboard from "@/components/insights/DisruptionLeaderboard";
import { useT } from "@/lib/i18n/useT";
import type { AnalysisPageData } from "@/lib/analysis";

function Section({ eyebrow, title, explainer, children }: { eyebrow: string; title: string; explainer: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section className="space-y-5">
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

export default function InsightsView({ data }: { data: AnalysisPageData }) {
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
      <Reveal>
        <EvidenceStack />
      </Reveal>
      <hr className="divider-glow" />
      <Section eyebrow="01" title={t("signalTitle")} explainer={t("signalExplainer")}><AISignalScatter data={data.aiSignal} /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="02" title={t("exposureLensesTitle")} explainer={t("exposureLensesExplainer")}><ExposureLensComparison comparison={data.exposureComparison} leaders={data.exposureGapLeaders} /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="03" title={t("marketSignalTitle")} explainer={t("marketSignalExplainer")}><MarketSignalLens /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="04" title={t("forecastTitle")} explainer={t("forecastExplainer")}><EmploymentForecastChart national={data.nationalForecast} signalPoints={data.aiSignal.points} forecasts={data.forecasts} /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="05" title={t("aiForcesTitle")} explainer={t("aiForcesExplainer")}><AIForcesTimeline /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="06" title={t("disruptionTitle")} explainer={t("disruptionExplainer")}><DisruptionLeaderboard index={data.disruptionIndex} /></Section>
    </div>
  );
}
