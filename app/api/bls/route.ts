import { NextResponse } from "next/server";
import { getIndustryEmployment, getUnemploymentRate, getEmploymentProjections } from "@/lib/bls";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "industries": {
        const start = searchParams.get("start") ?? "2015";
        const end = searchParams.get("end") ?? "2025";
        const data = await getIndustryEmployment(start, end);
        return NextResponse.json(data);
      }
      case "unemployment": {
        const start = searchParams.get("start") ?? "2015";
        const end = searchParams.get("end") ?? "2025";
        const data = await getUnemploymentRate(start, end);
        return NextResponse.json(data);
      }
      case "projections": {
        const year = searchParams.get("year") ?? "2024";
        const data = await getEmploymentProjections(year);
        return NextResponse.json(data);
      }
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