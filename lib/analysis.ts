import occupationSnapshot from "@/data/occupation-snapshot.json";

/**
 * Descriptive, exploratory analytics for Insights Lab. These statistics summarize
 * historical BLS-style labor outcomes alongside AI exposure; they are not causal claims.
 */

// ---- pure stats helpers (export for unit tests) ----
export interface RegressionResult { slope: number; intercept: number; r: number; r2: number; n: number; }
export function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const pairs = pairFinite(xs, ys);
  const n = pairs.length;
  if (n === 0) return { slope: 0, intercept: 0, r: 0, r2: 0, n: 0 };

  const xMean = pairs.reduce((sum, p) => sum + p.x, 0) / n;
  const yMean = pairs.reduce((sum, p) => sum + p.y, 0) / n;
  const centered = pairs.reduce(
    (acc, p) => {
      const dx = p.x - xMean;
      const dy = p.y - yMean;
      acc.xx += dx * dx;
      acc.xy += dx * dy;
      return acc;
    },
    { xx: 0, xy: 0 },
  );

  const slope = centered.xx > 0 ? centered.xy / centered.xx : 0;
  const intercept = yMean - slope * xMean;
  const r = pearson(
    pairs.map((p) => p.x),
    pairs.map((p) => p.y),
  );

  return finiteRegression({ slope, intercept, r, r2: r * r, n });
}

export function pearson(xs: number[], ys: number[]): number {
  const pairs = pairFinite(xs, ys);
  const n = pairs.length;
  if (n < 2) return 0;

  const xMean = pairs.reduce((sum, p) => sum + p.x, 0) / n;
  const yMean = pairs.reduce((sum, p) => sum + p.y, 0) / n;
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const pair of pairs) {
    const dx = pair.x - xMean;
    const dy = pair.y - yMean;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }
  if (xx <= 0 || yy <= 0) return 0;
  const r = xy / Math.sqrt(xx * yy);
  return Number.isFinite(r) ? clamp(r, -1, 1) : 0;
}

// ---- 1. AI Signal Scan ----
export interface SignalPoint { code: string; name: string; sector: string; exposure: number; /*0-100*/ employment: number; empGrowth: number; /*annualized CAGR %*/ wageGrowth: number; }
export interface QuartileStat { metric: "employment" | "wage"; lowAvgGrowth: number; highAvgGrowth: number; }
export interface AISignalData {
  points: SignalPoint[];
  empRegression: RegressionResult;   // x=exposure(0-100) -> y=empGrowth
  wageRegression: RegressionResult;  // x=exposure(0-100) -> y=wageGrowth
  quartiles: QuartileStat[];         // one for employment, one for wage (avg growth of bottom vs top exposure quartile)
  window: { fromYear: number; toYear: number }; // overall min/max years used
}
export function getAISignalData(): AISignalData {
  if (_aiSignalCache) return cloneAISignalData(_aiSignalCache);

  let fromYear = Number.POSITIVE_INFINITY;
  let toYear = Number.NEGATIVE_INFINITY;
  const points: SignalPoint[] = [];

  for (const row of snapshot) {
    const empGrowth = computeGrowthFromHistory(row.employmentHistory);
    const wageGrowth = computeGrowthFromHistory(row.wageHistory);
    if (!empGrowth || !wageGrowth) continue;

    const employment = latestPositiveValue(row.employmentHistory) ?? row.employment;
    if (!(employment != null && employment > 0)) continue;

    fromYear = Math.min(fromYear, empGrowth.fromYear, wageGrowth.fromYear);
    toYear = Math.max(toYear, empGrowth.toYear, wageGrowth.toYear);
    points.push({
      code: row.socCode,
      name: row.title,
      sector: row.sector,
      exposure: round1(toExposure(row.aiExposure)),
      employment: Math.round(employment),
      empGrowth: empGrowth.rate,
      wageGrowth: wageGrowth.rate,
    });
  }

  const exposures = points.map((p) => p.exposure);
  const empGrowths = points.map((p) => p.empGrowth);
  const wageGrowths = points.map((p) => p.wageGrowth);
  const sortedByExposure = [...points].sort((a, b) => a.exposure - b.exposure);
  const quartileSize = Math.max(1, Math.floor(sortedByExposure.length * 0.25));
  const lowQuartile = sortedByExposure.slice(0, quartileSize);
  const highQuartile = sortedByExposure.slice(-quartileSize);

  _aiSignalCache = {
    points,
    empRegression: linearRegression(exposures, empGrowths),
    wageRegression: linearRegression(exposures, wageGrowths),
    quartiles: [
      {
        metric: "employment",
        lowAvgGrowth: round1(avg(lowQuartile.map((p) => p.empGrowth))),
        highAvgGrowth: round1(avg(highQuartile.map((p) => p.empGrowth))),
      },
      {
        metric: "wage",
        lowAvgGrowth: round1(avg(lowQuartile.map((p) => p.wageGrowth))),
        highAvgGrowth: round1(avg(highQuartile.map((p) => p.wageGrowth))),
      },
    ],
    window: finiteWindow(fromYear, toYear),
  };

  return cloneAISignalData(_aiSignalCache);
}

// ---- 2. Employment Forecast to 2030 ----
export interface ForecastPoint { year: number; value: number; projected: boolean; }
export interface OccupationForecast {
  code: string; name: string; sector: string; exposure: number; // 0-100
  cagr: number;                 // annualized % used for baseline
  history: ForecastPoint[];     // actual, projected:false
  baseline: ForecastPoint[];    // 2026..2030 trend extrapolation, projected:true
  aiAdjusted: ForecastPoint[];  // 2026..2030 at default sensitivity 0.5, projected:true
}
export interface NationalForecast {
  history: ForecastPoint[]; baseline: ForecastPoint[]; aiAdjusted: ForecastPoint[];
  totalBaseline2030: number; totalAiAdjusted2030: number; deltaJobs2030: number; // aiAdjusted - baseline
}
export function getEmploymentForecast(code: string): OccupationForecast | null {
  if (!_forecastCache) buildForecastCache();
  const forecast = _forecastCache?.byCode.get(code) ?? null;
  return forecast ? cloneOccupationForecast(forecast) : null;
}

export function getNationalForecast(): NationalForecast {
  if (!_forecastCache) buildForecastCache();
  return cloneNationalForecast(_forecastCache?.national ?? emptyNationalForecast());
}

// ---- 3. AI Disruption Index ----
export interface DisruptionScore {
  code: string; name: string; sector: string; score: number; /*0-100*/ rank: number;
  exposure: number; empGrowth: number; wageGrowth: number; // display components
}
export interface SectorDisruption { sector: string; score: number; rank: number; avgExposure: number; avgEmpGrowth: number; occupationCount: number; }
export interface DisruptionIndex { occupations: DisruptionScore[]; sectors: SectorDisruption[]; weights: Record<string, number>; }
export function getDisruptionIndex(): DisruptionIndex {
  if (_disruptionCache) return cloneDisruptionIndex(_disruptionCache);

  const signal = getAISignalData().points;
  const byCode = new Map(snapshot.map((row) => [row.socCode, row]));
  const weights = { exposure: 0.40, employmentDecline: 0.25, wageStagnation: 0.20, lackBrightOutlook: 0.15 };
  const exposureValues = signal.map((p) => p.exposure);
  const declineValues = signal.map((p) => -p.empGrowth);
  const stagnationValues = signal.map((p) => -p.wageGrowth);

  const occupations = signal
    .map((point) => {
      const row = byCode.get(point.code);
      const componentScore =
        weights.exposure * normalize(point.exposure, exposureValues) +
        weights.employmentDecline * normalize(-point.empGrowth, declineValues) +
        weights.wageStagnation * normalize(-point.wageGrowth, stagnationValues) +
        weights.lackBrightOutlook * (row?.brightOutlook ? 0 : 1);
      return {
        code: point.code,
        name: point.name,
        sector: point.sector,
        score: round1(clamp(componentScore * 100, 0, 100)),
        rank: 0,
        exposure: point.exposure,
        empGrowth: point.empGrowth,
        wageGrowth: point.wageGrowth,
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((occupation, index) => ({ ...occupation, rank: index + 1 }));

  const sectorMap = new Map<string, { score: number; exposure: number; empGrowth: number; count: number }>();
  for (const occupation of occupations) {
    const sector = sectorMap.get(occupation.sector) ?? { score: 0, exposure: 0, empGrowth: 0, count: 0 };
    sector.score += occupation.score;
    sector.exposure += occupation.exposure;
    sector.empGrowth += occupation.empGrowth;
    sector.count += 1;
    sectorMap.set(occupation.sector, sector);
  }

  const sectors = Array.from(sectorMap.entries())
    .map(([sector, values]) => ({
      sector,
      score: round1(values.score / values.count),
      rank: 0,
      avgExposure: round1(values.exposure / values.count),
      avgEmpGrowth: round1(values.empGrowth / values.count),
      occupationCount: values.count,
    }))
    .sort((a, b) => b.score - a.score || a.sector.localeCompare(b.sector))
    .map((sector, index) => ({ ...sector, rank: index + 1 }));

  _disruptionCache = { occupations, sectors, weights };
  return cloneDisruptionIndex(_disruptionCache);
}

type SnapshotRow = {
  socCode: string;
  title: string;
  sector: string;
  aiExposure: number;
  automationRisk: "Low" | "Medium" | "High" | "Very High";
  automationProbability: number;
  medianSalary: number;
  employment: number | null;
  projectedOpenings: number | null;
  growthRate: number | null;
  jobZone: number;
  brightOutlook: boolean;
  outlook: "Bright" | "Average";
  skills: string[];
  employmentHistory?: Record<string, number>;
  wageHistory?: Record<string, number>;
};

type GrowthResult = { rate: number; fromYear: number; toYear: number };
type ForecastCache = { byCode: Map<string, OccupationForecast>; national: NationalForecast };

const snapshot = occupationSnapshot as SnapshotRow[];
const LATEST_ACTUAL_YEAR = 2025;
const DEFAULT_AI_SENSITIVITY = 0.5;

let _aiSignalCache: AISignalData | null = null;
let _forecastCache: ForecastCache | null = null;
let _disruptionCache: DisruptionIndex | null = null;

function computeGrowthFromHistory(history?: Record<string, number> | null): GrowthResult | null {
  const usable = historyPoints(history);
  if (usable.length < 2) return null;
  const first = usable[0];
  const last = usable[usable.length - 1];
  if (last.year <= first.year || first.value <= 0 || last.value <= 0) return null;
  const cagr = (Math.pow(last.value / first.value, 1 / (last.year - first.year)) - 1) * 100;
  return Number.isFinite(cagr) ? { rate: round1(cagr), fromYear: first.year, toYear: last.year } : null;
}

function buildForecastCache(): void {
  const byCode = new Map<string, OccupationForecast>();
  const historyByYear = new Map<number, number>();
  const baselineByYear = new Map<number, number>();
  const aiAdjustedByYear = new Map<number, number>();

  for (const row of snapshot) {
    const forecast = buildOccupationForecast(row);
    if (!forecast) continue;
    byCode.set(forecast.code, forecast);

    for (const point of forecast.history) {
      historyByYear.set(point.year, (historyByYear.get(point.year) ?? 0) + point.value);
    }
    for (const point of forecast.baseline) {
      baselineByYear.set(point.year, (baselineByYear.get(point.year) ?? 0) + point.value);
    }
    for (const point of forecast.aiAdjusted) {
      aiAdjustedByYear.set(point.year, (aiAdjustedByYear.get(point.year) ?? 0) + point.value);
    }
  }

  const baseline = mapToForecastPoints(baselineByYear, true);
  const aiAdjusted = mapToForecastPoints(aiAdjustedByYear, true);
  const totalBaseline2030 = Math.round(baselineByYear.get(2030) ?? 0);
  const totalAiAdjusted2030 = Math.round(aiAdjustedByYear.get(2030) ?? 0);

  _forecastCache = {
    byCode,
    national: {
      history: mapToForecastPoints(historyByYear, false),
      baseline,
      aiAdjusted,
      totalBaseline2030,
      totalAiAdjusted2030,
      deltaJobs2030: totalAiAdjusted2030 - totalBaseline2030,
    },
  };
}

function buildOccupationForecast(row: SnapshotRow): OccupationForecast | null {
  const history = historyPoints(row.employmentHistory);
  if (history.length < 2) return null;

  const latest = history.find((point) => point.year === LATEST_ACTUAL_YEAR) ?? history[history.length - 1];
  if (!latest || latest.value <= 0) return null;

  const endpointGrowth = computeGrowthFromHistory(row.employmentHistory);
  const trendRate = fitLogTrendRate(history);
  const cagr = round1(clamp(
    Number.isFinite(trendRate) ? trendRate : endpointGrowth?.rate ?? 0,
    -8,
    8,
  ));
  const exposure = round1(toExposure(row.aiExposure));
  const annualDrag = DEFAULT_AI_SENSITIVITY * (exposure / 100) * 0.04;

  const baseline: ForecastPoint[] = [];
  const aiAdjusted: ForecastPoint[] = [];
  for (let year = 2026; year <= 2030; year += 1) {
    const k = year - LATEST_ACTUAL_YEAR;
    const baselineValue = latest.value * Math.pow(1 + cagr / 100, k);
    const adjustedValue = baselineValue * Math.pow(1 - annualDrag, k);
    baseline.push({ year, value: Math.round(baselineValue), projected: true });
    aiAdjusted.push({ year, value: Math.round(adjustedValue), projected: true });
  }

  return {
    code: row.socCode,
    name: row.title,
    sector: row.sector,
    exposure,
    cagr,
    history: history.map((point) => ({ year: point.year, value: Math.round(point.value), projected: false })),
    baseline,
    aiAdjusted,
  };
}

function fitLogTrendRate(history: { year: number; value: number }[]): number {
  const years = history.map((point) => point.year);
  const logged = history.map((point) => Math.log(point.value));
  const regression = linearRegression(years, logged);
  if (regression.n < 2 || !Number.isFinite(regression.slope)) return Number.NaN;
  const rate = (Math.exp(regression.slope) - 1) * 100;
  return Number.isFinite(rate) ? rate : Number.NaN;
}

function historyPoints(history?: Record<string, number> | null): { year: number; value: number }[] {
  if (!history) return [];
  return Object.entries(history)
    .map(([year, value]) => ({ year: Number(year), value }))
    .filter((point) => Number.isFinite(point.year) && Number.isFinite(point.value) && point.value > 0)
    .sort((a, b) => a.year - b.year);
}

function latestPositiveValue(history?: Record<string, number> | null): number | null {
  const points = historyPoints(history);
  return points.length > 0 ? points[points.length - 1].value : null;
}

function toExposure(aiExposure: number): number {
  return Number.isFinite(aiExposure) ? clamp(aiExposure * 100, 0, 100) : 0;
}

function pairFinite(xs: number[], ys: number[]): { x: number; y: number }[] {
  const length = Math.min(xs.length, ys.length);
  const pairs: { x: number; y: number }[] = [];
  for (let index = 0; index < length; index += 1) {
    const x = xs[index];
    const y = ys[index];
    if (Number.isFinite(x) && Number.isFinite(y)) pairs.push({ x, y });
  }
  return pairs;
}

function finiteRegression(result: RegressionResult): RegressionResult {
  return {
    slope: finiteNumber(result.slope),
    intercept: finiteNumber(result.intercept),
    r: finiteNumber(result.r),
    r2: finiteNumber(result.r2),
    n: result.n,
  };
}

function finiteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function avg(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function normalize(value: number, population: number[]): number {
  const finite = population.filter(Number.isFinite);
  if (finite.length === 0 || !Number.isFinite(value)) return 0;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}

function finiteWindow(fromYear: number, toYear: number): { fromYear: number; toYear: number } {
  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
    return { fromYear: LATEST_ACTUAL_YEAR, toYear: LATEST_ACTUAL_YEAR };
  }
  return { fromYear, toYear };
}

function mapToForecastPoints(values: Map<number, number>, projected: boolean): ForecastPoint[] {
  return Array.from(values.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, value]) => ({ year, value: Math.round(value), projected }));
}

function emptyNationalForecast(): NationalForecast {
  return {
    history: [],
    baseline: [],
    aiAdjusted: [],
    totalBaseline2030: 0,
    totalAiAdjusted2030: 0,
    deltaJobs2030: 0,
  };
}

function cloneAISignalData(data: AISignalData): AISignalData {
  return {
    points: data.points.map((point) => ({ ...point })),
    empRegression: { ...data.empRegression },
    wageRegression: { ...data.wageRegression },
    quartiles: data.quartiles.map((quartile) => ({ ...quartile })),
    window: { ...data.window },
  };
}

function cloneOccupationForecast(forecast: OccupationForecast): OccupationForecast {
  return {
    ...forecast,
    history: forecast.history.map((point) => ({ ...point })),
    baseline: forecast.baseline.map((point) => ({ ...point })),
    aiAdjusted: forecast.aiAdjusted.map((point) => ({ ...point })),
  };
}

function cloneNationalForecast(forecast: NationalForecast): NationalForecast {
  return {
    history: forecast.history.map((point) => ({ ...point })),
    baseline: forecast.baseline.map((point) => ({ ...point })),
    aiAdjusted: forecast.aiAdjusted.map((point) => ({ ...point })),
    totalBaseline2030: forecast.totalBaseline2030,
    totalAiAdjusted2030: forecast.totalAiAdjusted2030,
    deltaJobs2030: forecast.deltaJobs2030,
  };
}

function cloneDisruptionIndex(index: DisruptionIndex): DisruptionIndex {
  return {
    occupations: index.occupations.map((occupation) => ({ ...occupation })),
    sectors: index.sectors.map((sector) => ({ ...sector })),
    weights: { ...index.weights },
  };
}
