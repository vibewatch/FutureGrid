"use client";

import SkillTransitionChart from "@/components/charts/SkillTransitionChart";
import { generateAllCareerInsights } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import { useState, useMemo } from "react";
import Link from "next/link";
import ReskillExplorer from "@/components/skills/ReskillExplorer";

const GROUPS = ["Technical", "Cognitive", "Interpersonal", "Administrative", "Management"];

const GROUP_SKILLS: Record<string, string[]> = {
  Technical:      ["Programming", "Systems Analysis", "Complex Problem Solving", "Mathematics", "Quality Control"],
  Cognitive:      ["Critical Thinking", "Active Learning", "Judgment and Decision Making", "Creativity", "Monitoring"],
  Interpersonal:  ["Active Listening", "Speaking", "Persuasion", "Service Orientation", "Social Perceptiveness"],
  Administrative: ["Reading Comprehension", "Writing", "Coordination", "Time Management", "Management of Material Resources"],
  Management:     ["Management of Personnel", "Negotiation", "Instructing", "Learning Strategies", "Systems Evaluation"],
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  Technical:      "Programming, analysis, and STEM competencies most resistant to automation.",
  Cognitive:      "Higher-order thinking and judgment that AI struggles to replicate.",
  Interpersonal:  "Human-centric communication and relationship skills.",
  Administrative: "Coordination, documentation, and organizational skills.",
  Management:     "Leadership, strategy, and people-management capabilities.",
};

type SkillSortKey = "risk-desc" | "risk-asc" | "salary" | "openings";

export default function SkillsPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>("Technical");
  const [sortKey, setSortKey] = useState<SkillSortKey>("risk-asc");
  const allInsights = useMemo(() => generateAllCareerInsights(), []);

  const occupationsWithSkill = useMemo(() => {
    const skills = GROUP_SKILLS[selectedGroup] ?? [];
    const filtered = allInsights.filter((i) =>
      i.skills.some((s) => skills.includes(s)),
    );
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "risk-desc": return b.automationProbability - a.automationProbability;
        case "risk-asc":  return a.automationProbability - b.automationProbability;
        case "salary":    return b.medianSalary - a.medianSalary;
        case "openings":  return (b.projectedOpenings ?? -Infinity) - (a.projectedOpenings ?? -Infinity);
      }
    });
  }, [selectedGroup, sortKey, allInsights]);

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          Skill Transition Pathways
        </h1>
        <p className="text-zinc-400 mt-1">
          Identify skill-based pathways from high-exposure to low-exposure occupations.
        </p>
      </div>

      {/* Chart */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <SkillTransitionChart />
      </div>

      {/* Skill group tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              aria-pressed={selectedGroup === group}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                selectedGroup === group
                  ? "brand-grad text-white shadow-md"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {group}
            </button>
          ))}
        </div>
        {GROUP_DESCRIPTIONS[selectedGroup] && (
          <p className="text-zinc-500 text-sm">{GROUP_DESCRIPTIONS[selectedGroup]}</p>
        )}
      </div>

      {/* Result bar + sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-zinc-400 text-sm">
          <span className="text-white font-semibold">{occupationsWithSkill.length}</span>{" "}
          occupation{occupationsWithSkill.length !== 1 ? "s" : ""} use{" "}
          <span className="text-violet-400">{selectedGroup}</span> skills
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Sort</span>
          {(
            [
              { key: "risk-asc",  label: "Safest First"  },
              { key: "risk-desc", label: "Most at Risk"  },
              { key: "salary",    label: "Highest Pay"   },
              { key: "openings",  label: "Most Openings" },
            ] as { key: SkillSortKey; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              aria-pressed={sortKey === key}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                sortKey === key
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Occupation grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {occupationsWithSkill.map((i) => {
          const riskColor = colorForRisk(i.automationRisk);
          const matchedSkills = i.skills.filter(
            (s) => GROUP_SKILLS[selectedGroup]?.includes(s),
          );
          return (
            <Link
              key={i.occupationCode}
              href={`/careers/${i.occupationCode}`}
              className="block glass glass-hover bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 focus:outline-none focus:ring-2 focus:ring-violet-500 group transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-2">
                  <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-cyan-300 transition-colors">
                    {i.occupationName}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{i.sectorName}</p>
                </div>
                <span
                  className="shrink-0 px-2 py-0.5 rounded text-xs font-semibold"
                  style={{
                    backgroundColor: `${riskColor}22`,
                    color: riskColor,
                  }}
                >
                  {(i.automationProbability * 100).toFixed(0)}%
                </span>
              </div>

              {/* Risk bar */}
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${i.automationProbability * 100}%`,
                    backgroundColor: riskColor,
                  }}
                />
              </div>

              {/* Salary */}
              <p className="text-xs text-zinc-500 mb-2.5">
                Salary:{" "}
                <span className="text-zinc-300 font-medium">
                  {formatCurrency(i.medianSalary)}
                </span>
              </p>

              {/* Matched skills */}
              <div className="flex flex-wrap gap-1">
                {matchedSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded bg-violet-900/30 border border-violet-700/30 text-violet-300 text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {occupationsWithSkill.length === 0 && (
        <div className="glass bg-zinc-900/40 border border-zinc-800 rounded-xl py-12 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">No occupations found for this skill group.</p>
        </div>
      )}

      {/* Divider */}
      <hr className="border-zinc-800" />

      {/* Reskilling Pathways Explorer */}
      <ReskillExplorer />
    </div>
  );
}
