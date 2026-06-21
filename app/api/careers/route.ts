import { NextResponse } from "next/server";
import { generateAllCareerInsights, getSectorAggregates } from "@/lib/data";

let cached: ReturnType<typeof generateAllCareerInsights> | null = null;

function getInsights() {
  if (!cached) cached = generateAllCareerInsights();
  return cached;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "all":
        return NextResponse.json({ occupations: getInsights() });
      case "risk": {
        const risk = searchParams.get("level");
        const filtered = risk
          ? getInsights().filter((i) => i.automationRisk === risk)
          : getInsights();
        return NextResponse.json({ occupations: filtered });
      }
      case "sectors":
        return NextResponse.json({ sectors: getSectorAggregates() });
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}