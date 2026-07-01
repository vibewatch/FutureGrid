"use client";

import Reveal from "@/components/ui/Reveal";
import AISignalScatter from "@/components/insights/AISignalScatter";
import ExposureLensComparison from "@/components/insights/ExposureLensComparison";
import EmploymentForecastChart from "@/components/insights/EmploymentForecastChart";
import AIForcesTimeline from "@/components/insights/AIForcesTimeline";
import DisruptionLeaderboard from "@/components/insights/DisruptionLeaderboard";
import { useT } from "@/lib/i18n/useT";

function Section({ eyebrow, title, explainer, children }: { eyebrow: string; title: string; explainer: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold text-gradient">{title}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{explainer}</p>
        </div>
        <div className="glass p-5 sm:p-6">{children}</div>
      </section>
    </Reveal>
  );
}

export default function InsightsView() {
  const t = useT("analysis");
  return (
    <div className="max-w-[1400px] space-y-12">
      <section className="pt-4 pb-2">
        <Reveal>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">{t("pageTitle")}</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">{t("pageSubhead")}</p>
        </Reveal>
        <Reveal delay={120} className="mt-6">
          <div className="glass flex max-w-4xl gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400" role="note">
            <span aria-hidden="true" className="mt-px shrink-0 text-zinc-500">ℹ</span>
            <p>{t("framingNote")}</p>
          </div>
        </Reveal>
      </section>

      <hr className="divider-glow" />
      <Section eyebrow="01" title={t("signalTitle")} explainer={t("signalExplainer")}><AISignalScatter /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="02" title={t("exposureLensesTitle")} explainer={t("exposureLensesExplainer")}><ExposureLensComparison /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="03" title={t("forecastTitle")} explainer={t("forecastExplainer")}><EmploymentForecastChart /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="04" title={t("aiForcesTitle")} explainer={t("aiForcesExplainer")}><AIForcesTimeline /></Section>
      <hr className="divider-glow" />
      <Section eyebrow="05" title={t("disruptionTitle")} explainer={t("disruptionExplainer")}><DisruptionLeaderboard /></Section>
    </div>
  );
}
