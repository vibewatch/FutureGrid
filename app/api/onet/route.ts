import { NextResponse } from "next/server";
import { searchOccupations, getAllOccupations, getOccupationSkills, getOccupationTechnology } from "@/lib/onet";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "search": {
        const keyword = searchParams.get("keyword");
        if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });
        const data = await searchOccupations(keyword);
        return NextResponse.json(data);
      }
      case "all": {
        const data = await getAllOccupations();
        return NextResponse.json(data);
      }
      case "skills": {
        const code = searchParams.get("code");
        if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
        const data = await getOccupationSkills(code);
        return NextResponse.json(data);
      }
      case "technology": {
        const code = searchParams.get("code");
        if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
        const data = await getOccupationTechnology(code);
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