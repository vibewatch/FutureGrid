import { OccupationsResponse, SkillGroup, TechnologyCategory, WorkActivity } from "./types";

const BASE_URL = "https://api-v2.onetcenter.org/";
const AUTH_HEADER = "X-API-Key";

function getApiKey(): string {
  const key = process.env.ONET_API_KEY;
  if (!key) throw new Error("ONET_API_KEY not configured");
  return key;
}

async function fetchOnet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      [AUTH_HEADER]: getApiKey(),
    },
  });
  if (!res.ok) throw new Error(`O*NET API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function searchOccupations(keyword: string, start = 1, end = 20): Promise<OccupationsResponse> {
  return fetchOnet<OccupationsResponse>(`online/search?keyword=${encodeURIComponent(keyword)}&start=${start}&end=${end}`);
}

export async function getAllOccupations(): Promise<OccupationsResponse> {
  return fetchOnet<OccupationsResponse>("online/browse/occupations");
}

export async function getOccupationSkills(code: string): Promise<{ group: SkillGroup[] }> {
  return fetchOnet(`online/occupation/${encodeURIComponent(code)}/summary/skills`);
}

export async function getOccupationTechnology(code: string): Promise<{ category: TechnologyCategory[] }> {
  return fetchOnet(`online/occupation/${encodeURIComponent(code)}/summary/technology`);
}

export async function getOccupationWorkActivities(code: string): Promise<{ group: WorkActivity[] }> {
  return fetchOnet(`online/occupation/${encodeURIComponent(code)}/summary/work_activities`);
}

export async function getOccupationKnowledge(code: string): Promise<{ group: SkillGroup[] }> {
  return fetchOnet(`online/occupation/${encodeURIComponent(code)}/summary/knowledge`);
}

export async function getOccupationAbilities(code: string): Promise<{ group: SkillGroup[] }> {
  return fetchOnet(`online/occupation/${encodeURIComponent(code)}/summary/abilities`);
}