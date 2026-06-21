import { NextResponse } from "next/server";

const OECD_DATA = [
  { country: "United States", year: 2024, employmentRate: 70.8, unemploymentRate: 3.7, ictEmployment: 5.2 },
  { country: "United Kingdom", year: 2024, employmentRate: 75.2, unemploymentRate: 4.0, ictEmployment: 5.5 },
  { country: "Germany", year: 2024, employmentRate: 77.0, unemploymentRate: 3.2, ictEmployment: 4.2 },
  { country: "France", year: 2024, employmentRate: 68.8, unemploymentRate: 7.3, ictEmployment: 3.8 },
  { country: "Japan", year: 2024, employmentRate: 79.0, unemploymentRate: 2.5, ictEmployment: 4.8 },
  { country: "Canada", year: 2024, employmentRate: 74.0, unemploymentRate: 5.5, ictEmployment: 6.1 },
  { country: "Australia", year: 2024, employmentRate: 74.5, unemploymentRate: 3.8, ictEmployment: 5.0 },
  { country: "South Korea", year: 2024, employmentRate: 68.0, unemploymentRate: 2.8, ictEmployment: 5.8 },
  { country: "Sweden", year: 2024, employmentRate: 76.5, unemploymentRate: 7.8, ictEmployment: 7.5 },
  { country: "Netherlands", year: 2024, employmentRate: 79.5, unemploymentRate: 3.5, ictEmployment: 5.9 },
];

export async function GET() {
  try {
    return NextResponse.json({ data: OECD_DATA });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}