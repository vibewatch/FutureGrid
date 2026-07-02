"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useT } from "@/lib/i18n/useT";
import { getWorkforceExposure } from "@/lib/data";
import QuadrantScatterChart from "@/components/charts/QuadrantScatterChart";
import TreemapChart from "@/components/charts/TreemapChart";
import BeeswarmChart from "@/components/charts/BeeswarmChart";
import WorldChoropleth from "@/components/charts/WorldChoropleth";
import SkillFlowSankey from "@/components/charts/SkillFlowSankey";
import { generateAllCareerInsights } from "@/lib/data";

// Standalone wrapper: generates its own data so BeeswarmChart fits the no-props Beat type
function BeeswarmChartStandalone() {
  const data = useMemo(() => generateAllCareerInsights(), []);
  return <BeeswarmChart data={data} />;
}

// ── Story beat config ──────────────────────────────────────────────────────────

interface Beat {
  id: string;
  titleKey: string;
  subheadKey: string;
  bodyKey: string;
  Chart: React.ComponentType;
}

const BEATS: Beat[] = [
  {
    id: "exposure",
    titleKey: "beat1Title",
    subheadKey: "beat1Subhead",
    bodyKey: "beat1Body",
    Chart: QuadrantScatterChart,
  },
  {
    id: "sectors",
    titleKey: "beat2Title",
    subheadKey: "beat2Subhead",
    bodyKey: "beat2Body",
    Chart: TreemapChart,
  },
  {
    id: "swarm",
    titleKey: "beat3Title",
    subheadKey: "beat3Subhead",
    bodyKey: "beat3Body",
    Chart: BeeswarmChartStandalone,
  },
  {
    id: "global",
    titleKey: "beat4Title",
    subheadKey: "beat4Subhead",
    bodyKey: "beat4Body",
    Chart: WorldChoropleth,
  },
  {
    id: "pathforward",
    titleKey: "beat5Title",
    subheadKey: "beat5Subhead",
    bodyKey: "beat5Body",
    Chart: SkillFlowSankey,
  },
];

// ── Step pill nav ──────────────────────────────────────────────────────────────

function StepPill({
  active,
  label,
  onClick,
}: {
  index: number;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      aria-label={label}
      className={`w-2.5 h-2.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        active
          ? "bg-violet-500 scale-125"
          : "bg-zinc-300 dark:bg-zinc-700 hover:bg-violet-400 dark:hover:bg-violet-500"
      }`}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReportView() {
  const t = useT("report");

  // Detect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Detect desktop (lg breakpoint). The sticky scrollytelling layout only runs
  // on desktop; mobile + SSR/first paint use the stacked layout. This guarantees
  // every chart mounts exactly once in a visible, measurable container — charts
  // mounted in a `display:none` box measure 0 width and crash (d3-sankey / geo
  // projection throw on a 0/NaN extent).
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Active beat index
  const [activeIndex, setActiveIndex] = useState(0);

  // Refs for each step section
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  // Compute headline stats from data
  const exposure = useMemo(() => getWorkforceExposure(), []);
  const highPct = (exposure.highExposureShare * 100).toFixed(1);
  const highM = (exposure.highExposureWorkforce / 1_000_000).toFixed(1);

  // Interpolate body text with stats for beat 1
  function beatBody(beat: Beat, index: number): string {
    if (index === 0) {
      return t(beat.bodyKey, { highPct, highM });
    }
    return t(beat.bodyKey);
  }

  // IntersectionObserver — scroll into view triggers active index
  useEffect(() => {
    if (reducedMotion || !isDesktop) return;

    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveIndex(i);
            }
          }
        },
        {
          root: null,
          // Trigger when step enters the middle third of the viewport
          rootMargin: "-30% 0px -30% 0px",
          threshold: 0,
        },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, [reducedMotion, isDesktop]);

  // Scroll to a step by index
  function scrollToStep(index: number) {
    stepRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const activeBeat = BEATS[activeIndex];

  // ── Stacked layout: reduced-motion OR mobile OR pre-mount (SSR/first paint) ──
  // Charts render once each in visible containers (never display:none → no
  // zero-width crash). Desktop with motion enabled gets the scrollytelling
  // layout below once isDesktop resolves on the client.
  if (reducedMotion || !isDesktop) {
    return (
      <div className="max-w-[1200px] space-y-6">
        {/* Hero */}
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            {t("pageTitle")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2 max-w-2xl">
            {t("pageSubhead")}
          </p>
          {reducedMotion && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2 italic">
              {t("reducedMotionNote")}
            </p>
          )}
        </div>

        {BEATS.map((beat, i) => (
          <section
            key={beat.id}
            aria-label={t("stepAriaLabel", { n: String(i + 1), title: t(beat.titleKey) })}
            className="space-y-4"
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                {t("stepOf", { n: String(i + 1), total: String(BEATS.length) })}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-gradient mt-1">
                {t(beat.titleKey)}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
                {t(beat.subheadKey)}
              </p>
            </div>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-prose">
              {beatBody(beat, i)}
            </p>
            <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
              <beat.Chart />
            </div>
          </section>
        ))}
      </div>
    );
  }

  // ── Scrollytelling layout ──────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {/* Hero */}
      <div className="animate-fade-up mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {t("pageTitle")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2 max-w-2xl">
          {t("pageSubhead")}
        </p>
        <p className="mt-4 text-sm text-zinc-400 dark:text-zinc-500 animate-pulse">
          ↓ {t("scrollPrompt")}
        </p>
      </div>

      {/* Two-column scrollytelling container */}
      <div className="flex flex-col lg:flex-row gap-8 relative">

        {/* ── LEFT: Sticky chart stage ────────────────────────────────────── */}
        <div
          className="lg:w-[55%] lg:sticky lg:top-6 lg:self-start"
          style={{ maxHeight: "calc(100vh - 3rem)" }}
          aria-live="polite"
          aria-atomic="true"
          aria-label={t("chartAriaLabel", { title: t(activeBeat.titleKey) })}
        >
          {/* Step dot nav */}
          <div className="flex items-center gap-2 mb-3">
            {BEATS.map((beat, i) => (
              <StepPill
                key={beat.id}
                index={i}
                active={i === activeIndex}
                label={t("jumpToStep", { n: String(i + 1) })}
                onClick={() => scrollToStep(i)}
              />
            ))}
          </div>

          {/* Beat counter badge */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              {t("stepOf", {
                n: String(activeIndex + 1),
                total: String(BEATS.length),
              })}
            </span>
            <h2 className="text-xl font-bold tracking-tight text-gradient">
              {t(activeBeat.titleKey)}
            </h2>
          </div>

          {/* Chart panel — renders only the active chart, with fade transition */}
          <div
            className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 overflow-hidden transition-opacity duration-300 relative"
            style={{ minHeight: "420px" }}
          >
            {BEATS.map((beat, i) => (
              <div
                key={beat.id}
                role="region"
                aria-label={t("stepAriaLabel", {
                  n: String(i + 1),
                  title: t(beat.titleKey),
                })}
                className={`transition-opacity duration-300 ${
                  i === activeIndex ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
                }`}
                aria-hidden={i !== activeIndex}
              >
                {/* Render current + adjacent beats to avoid remount flash */}
                {Math.abs(i - activeIndex) <= 1 && <beat.Chart />}
              </div>
            ))}
          </div>

          {/* Active beat stat (beat 1 only) */}
          {activeIndex === 0 && (
            <div className="mt-4 flex gap-4">
              <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3 text-center">
                <p className="text-2xl font-bold text-gradient">
                  {t("beat1Stat", { highPct })}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t("beat1StatLabel")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Narrative steps ──────────────────────────────────────── */}
        <div className="lg:w-[45%] space-y-0">
          {BEATS.map((beat, i) => (
            <section
              key={beat.id}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              aria-label={t("stepAriaLabel", {
                n: String(i + 1),
                title: t(beat.titleKey),
              })}
              className={`min-h-[70vh] flex flex-col justify-center py-12 px-2 lg:px-6 transition-opacity duration-500 ${
                i === activeIndex
                  ? "opacity-100"
                  : "opacity-40 hover:opacity-70"
              }`}
            >
              {/* Step label */}
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
                {t("stepOf", { n: String(i + 1), total: String(BEATS.length) })}
              </span>

              {/* Title */}
              <h2
                className={`text-2xl font-bold tracking-tight mb-2 transition-colors duration-300 ${
                  i === activeIndex
                    ? "text-gradient"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {t(beat.titleKey)}
              </h2>

              {/* Subhead */}
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 font-medium">
                {t(beat.subheadKey)}
              </p>

              {/* Body */}
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-prose text-base">
                {beatBody(beat, i)}
              </p>

              {/* Divider between steps (not after last) */}
              {i < BEATS.length - 1 && (
                <div className="mt-12 h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-700 to-transparent" />
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
