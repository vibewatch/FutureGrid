"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/useT";

function LoadingStub() {
  const t = useT("labor");
  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
      {t("loading")}
    </div>
  );
}

const PulseView = dynamic(() => import("@/components/pulse/PulseView"), {
  ssr: false,
  loading: () => <LoadingStub />,
});

const LayoffsView = dynamic(() => import("@/components/layoffs/LayoffsView"), {
  ssr: false,
  loading: () => <LoadingStub />,
});

const WarnPressureView = dynamic(
  () => import("@/components/labor/WarnPressureView"),
  {
    ssr: false,
    loading: () => <LoadingStub />,
  },
);

type Tab = "trends" | "pressure" | "notices";

export default function LaborMarketView() {
  const t = useT("labor");
  const [activeTab, setActiveTab] = useState<Tab>("trends");

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {t("pageTitle")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
          {t("pageSubhead")}
        </p>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 flex gap-1 w-fit max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("trends")}
          aria-pressed={activeTab === "trends"}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === "trends"
              ? "bg-violet-600 text-white shadow"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
          }`}
        >
          {t("tabTrends")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notices")}
          aria-pressed={activeTab === "notices"}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === "notices"
              ? "bg-violet-600 text-white shadow"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
          }`}
        >
          {t("tabNotices")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pressure")}
          aria-pressed={activeTab === "pressure"}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            activeTab === "pressure"
              ? "bg-violet-600 text-white shadow"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
          }`}
        >
          {t("tabPressure")}
        </button>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      {activeTab === "trends" && <PulseView />}
      {activeTab === "pressure" && <WarnPressureView />}
      {activeTab === "notices" && <LayoffsView />}
    </div>
  );
}
