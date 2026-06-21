import { BLSResponse } from "./types";

const BASE_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

function getApiKey(): string {
  const key = process.env.BLS_API_KEY;
  if (!key) throw new Error("BLS_API_KEY not configured");
  return key;
}

interface BLSRequest {
  seriesid: string[];
  startyear: string;
  endyear: string;
  catalog?: boolean;
  calculations?: boolean;
  annualaverage?: boolean;
}

async function postBLS(body: BLSRequest): Promise<BLSResponse> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, registrationkey: getApiKey() }),
  });
  if (!res.ok) throw new Error(`BLS API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<BLSResponse>;
}

const INDUSTRY_SERIES: Record<string, { name: string; series: string }> = {
  "Total nonfarm": { name: "Total nonfarm", series: "CES0000000001" },
  "Mining and logging": { name: "Mining and logging", series: "CES1000000001" },
  Construction: { name: "Construction", series: "CES2000000001" },
  Manufacturing: { name: "Manufacturing", series: "CES3000000001" },
  "Trade, transportation, and utilities": { name: "Trade, transportation, and utilities", series: "CES4000000001" },
  Information: { name: "Information", series: "CES5000000001" },
  "Financial activities": { name: "Financial activities", series: "CES5500000001" },
  "Professional and business services": { name: "Professional and business services", series: "CES6000000001" },
  "Education and health services": { name: "Education and health services", series: "CES6500000001" },
  "Leisure and hospitality": { name: "Leisure and hospitality", series: "CES7000000001" },
  Government: { name: "Government", series: "CES9000000001" },
};

const UNEMPLOYMENT_SERIES = "LNS14000000";
const LABOR_FORCE_SERIES = "LNS11000000";

export async function getIndustryEmployment(startYear: string, endYear: string): Promise<BLSResponse> {
  const seriesIds = Object.values(INDUSTRY_SERIES).map((s) => s.series);
  return postBLS({ seriesid: seriesIds, startyear: startYear, endyear: endYear, annualaverage: true });
}

export async function getUnemploymentRate(startYear: string, endYear: string): Promise<BLSResponse> {
  return postBLS({ seriesid: [UNEMPLOYMENT_SERIES], startyear: startYear, endyear: endYear });
}

export async function getLaborForce(startYear: string, endYear: string): Promise<BLSResponse> {
  return postBLS({ seriesid: [LABOR_FORCE_SERIES], startyear: startYear, endyear: endYear });
}

export function getIndustryNames(): string[] {
  return Object.keys(INDUSTRY_SERIES);
}

export function getIndustrySeriesId(name: string): string {
  return INDUSTRY_SERIES[name]?.series ?? "";
}

export async function getEmploymentProjections(year: string): Promise<BLSResponse> {
  const seriesIds = Object.values(INDUSTRY_SERIES).map((s) => s.series);
  return postBLS({ seriesid: seriesIds, startyear: String(Number(year) - 10), endyear: year, annualaverage: true });
}