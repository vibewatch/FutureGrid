export interface OECDObservation {
  id: number;
  name: string;
  role: string;
  values: number[];
}

export interface OECDDataSet {
  name: string;
  observations: Record<string, number[]>;
}

export interface OECDEmployment {
  country: string;
  year: number;
  employmentRate: number;
  unemploymentRate: number;
  ictEmployment: number;
}

const BASE_URL = "https://stats.oecd.org/SDMX-JSON/data/DSD_LFS@DF_IALFS_IND";

async function fetchOECD<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OECD API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export { fetchOECD };