"use client";

import SkillTransitionChart from "@/components/charts/SkillTransitionChart";
import { generateAllCareerInsights } from "@/lib/data";
import { useState, useMemo } from "react";
import Link from "next/link";
import { colorForRisk } from "@/lib/utils";

const GROUPS = ["Technical", "Cognitive", "Interpersonal", "Administrative", "Management"];

const GROUP_SKILLS: Record<string, string[]> = {
  Technical: ["Programming", "Systems Analysis", "Complex Problem Solving", "Mathematics", "Quality Control"],
  Cognitive: ["Critical Thinking", "Active Learning", "Judgment and Decision Making", "Creativity", "Monitoring"],
  Interpersonal: ["Active Listening", "Speaking", "Persuasion", "Service Orientation", "Social Perceptiveness"],
  Administrative: ["Reading Comprehension", "Writing", "Coordination", "Time Management", "Management of Material Resources"],
  Management: ["Management of Personnel", "Negotiation", "Instructing", "Learning Strategies", "Systems Evaluation"],
};

export default function SkillsPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>("Technical");
  const allInsights = useMemo(() => generateAllCareerInsights(), []);

  const occupationsWithSkill = useMemo(() => {
    const skills = GROUP_SKILLS[selectedGroup] ?? [];
    return allInsights.filter((i) => i.skills.some((s) => skills.includes(s)));
  }, [selectedGroup, allInsights]);

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Skill Transition Pathways</h1>
        <p className="text-zinc-400 mt-1">Identify skill-based pathways from high-risk to low-risk occupations.</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <SkillTransitionChart />
      </div>

      <div className="flex flex-wrap gap-2">
        {GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedGroup === group
                ? "bg-purple-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {occupationsWithSkill.map((i) => (
          <Link
            key={i.occupationCode}
            href={`/careers/${i.occupationCode}`}
            className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-white text-sm">{i.occupationName}</h3>
              <span
                className="shrink-0 px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: `${colorForRisk(i.automationRisk)}22`, color: colorForRisk(i.automationRisk) }}
              >
                {(i.automationProbability * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {i.skills.filter((s) => GROUP_SKILLS[selectedGroup]?.includes(s)).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 text-xs">{s}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}