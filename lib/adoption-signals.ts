import aiUsageProxiesData from "@/data/ai-usage-proxies.json";

export interface SourceRef {
  name: string;
  publisher?: string;
  url?: string;
  dataset?: string;
  capturedAt?: string;
}

export interface ProviderModelEntry {
  modelId: string;
  downloads: number;
  likes: number;
  formattedValue?: string;
}

export interface SurveyDistributionEntry {
  label: string;
  count: number;
  percent: number;
}

export interface SignalValueMeta {
  metric?: string;
  population?: string;
  status?: string;
  firms?: number;
  responses?: number;
  count?: number;
  percent?: number;
  provider?: string;
  downloads?: number;
  likes?: number;
  entries?: ProviderModelEntry[];
  repository?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  updatedAt?: string;
  capturedAt?: string;
  potentialMetrics?: string[];
  reason?: string;
  sourceStatus?: string;
  sourceUrl?: string;
  formattedStars?: string;
  formattedForks?: string;
  formattedOpenIssues?: string;
}

export interface SignalValue {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  unit: string;
  period: string;
  source: SourceRef;
  confidence?: string;
  comparability?: string;
  geography?: string;
  meta?: SignalValueMeta;
}

export type SignalPanelKind =
  | "bar-list"
  | "kpi-grid"
  | "stacked-share"
  | "provider-models"
  | "repo-kpis"
  | "future-sources";

export type AdoptionSignalFamily =
  | "enterpriseAdoptionMetrics"
  | "individualGenerativeAIUsageMetrics"
  | "usCensusBusinessAIMetrics"
  | "countrySurveyMetrics"
  | "chinaAppMarketMetrics"
  | "chinaNativeAppMau"
  | "developerSurveyMetrics"
  | "openModelDownloadProxies"
  | "developerEcosystemProxies"
  | "aiResearchActivityMetrics"
  | "sourceCatalogForFutureCollection";

export interface SignalPanel {
  id: string;
  titleKey: string;
  descriptionKey: string;
  family: AdoptionSignalFamily;
  kind: SignalPanelKind;
  unit: string;
  caveat: string;
  sourceSummary: string;
  periodSummary: string;
  values: SignalValue[];
  benchmarks?: SignalValue[];
}

export interface AdoptionSignalsDataset {
  generatedAt: string;
  scope: string;
  caveat: string;
  panels: SignalPanel[];
  coverage: {
    collectedFamilies: string[];
    visualizedFamilies: string[];
    futureCatalogCount: number;
  };
}

interface RawGeo {
  code?: string;
  iso3?: string;
  name: string;
}

interface RawSourceObject {
  name: string;
  publisher?: string;
  dataset?: string;
  url?: string;
  updated?: string;
  primaryUnderlyingSource?: string;
}

interface RawGeoValue {
  geo: RawGeo;
  value: number;
  period?: string;
  status?: string;
  unit?: string;
}

interface RawMetricBase {
  id: string;
  metric: string;
  unit: string;
  period: string;
  population?: string;
  source: RawSourceObject;
  confidence?: string;
  comparability?: string;
}

interface RawCountryListMetric extends RawMetricBase {
  regionalAggregates?: RawGeoValue[];
  countries: RawGeoValue[];
}

interface RawUsBusinessMetric extends RawMetricBase {
  national: {
    geo: RawGeo;
    firms: number;
    percentOfEmployerFirms: number;
  };
  states: {
    geo: RawGeo;
    firms: number;
    percentOfEmployerFirms: number;
  }[];
}

interface RawCountrySurveyMetric extends RawMetricBase {
  geo: RawGeo;
  value: number;
}

interface RawChinaNativeAppMetric {
  id: string;
  geo: RawGeo;
  product: string;
  metric: string;
  value: number;
  unit: string;
  period: string;
  source: RawSourceObject;
  confidence?: string;
  comparability?: string;
}

interface RawSurveyDistributionQuestion {
  question: string;
  responses: number;
  distribution: SurveyDistributionEntry[];
}

interface RawDeveloperCountry {
  country: string;
  responses: number;
  yes: number;
  planSoon: number;
  noPlan: number;
  yesPercent: number;
  planSoonPercent: number;
  noPlanPercent: number;
}

interface RawDeveloperSurveyMetric extends RawMetricBase {
  responseCount: number;
  overall: RawSurveyDistributionQuestion[];
  countries: RawDeveloperCountry[];
}

interface RawOpenModelProvider {
  provider: string;
  capturedAt: string;
  source: string;
  metric: string;
  entries: ProviderModelEntry[];
  comparability?: string;
}

interface RawDeveloperEcosystemProxy {
  id: string;
  metric: string;
  repository: string;
  stars: number;
  forks: number;
  openIssues: number;
  repositoryUpdatedAt: string;
  capturedAt: string;
  source: string;
  confidence?: string;
  comparability?: string;
}

interface RawResearchMetric extends RawMetricBase {
  countries: RawGeoValue[];
}

interface RawFutureSource {
  name: string;
  status: string;
  reason: string;
  source?: string;
  potentialMetrics: string[];
}

interface RawAdoptionProxyDataset {
  generatedAt: string;
  scope: string;
  caveat: string;
  enterpriseAdoptionMetrics: RawCountryListMetric[];
  individualGenerativeAIUsageMetrics: RawCountryListMetric[];
  usCensusBusinessAIMetrics: RawUsBusinessMetric[];
  countrySurveyMetrics: RawCountrySurveyMetric[];
  chinaAppMarketMetrics: RawCountrySurveyMetric[];
  chinaNativeAppMau: RawChinaNativeAppMetric[];
  developerSurveyMetrics: RawDeveloperSurveyMetric[];
  openModelDownloadProxies: RawOpenModelProvider[];
  developerEcosystemProxies: RawDeveloperEcosystemProxy[];
  aiResearchActivityMetrics: RawResearchMetric[];
  sourceCatalogForFutureCollection: RawFutureSource[];
}

const data = aiUsageProxiesData as RawAdoptionProxyDataset;

const COLLECTED_FAMILIES: AdoptionSignalFamily[] = [
  "enterpriseAdoptionMetrics",
  "individualGenerativeAIUsageMetrics",
  "usCensusBusinessAIMetrics",
  "countrySurveyMetrics",
  "chinaAppMarketMetrics",
  "chinaNativeAppMau",
  "developerSurveyMetrics",
  "openModelDownloadProxies",
  "developerEcosystemProxies",
  "aiResearchActivityMetrics",
  "sourceCatalogForFutureCollection",
];

const FAMILY_TO_PANEL: { family: AdoptionSignalFamily; panelId: string }[] = [
  { family: "enterpriseAdoptionMetrics", panelId: "enterprise" },
  { family: "individualGenerativeAIUsageMetrics", panelId: "individual" },
  { family: "usCensusBusinessAIMetrics", panelId: "usBusiness" },
  { family: "countrySurveyMetrics", panelId: "countrySurvey" },
  { family: "chinaAppMarketMetrics", panelId: "chinaAppsMau" },
  { family: "chinaAppMarketMetrics", panelId: "chinaAppsUsage" },
  { family: "chinaNativeAppMau", panelId: "chinaNative" },
  { family: "developerSurveyMetrics", panelId: "developerSurveyOverall" },
  { family: "developerSurveyMetrics", panelId: "developerSurveyCountries" },
  { family: "openModelDownloadProxies", panelId: "openModels" },
  { family: "developerEcosystemProxies", panelId: "devEcosystem" },
  { family: "aiResearchActivityMetrics", panelId: "research" },
  { family: "sourceCatalogForFutureCollection", panelId: "future-sources" },
];

const DEFAULT_TOP_N = 8;
const GENERIC_CAVEAT = "Proxy indicator, not a census.";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectedFamiliesFromData(): string[] {
  return Object.keys(data).filter((key) => Array.isArray(data[key as keyof RawAdoptionProxyDataset]));
}

function assertAdoptionSignalCoverage(): void {
  const assigned = new Set<AdoptionSignalFamily>();

  for (const item of FAMILY_TO_PANEL) {
    assigned.add(item.family);
  }

  const collectedFamilies = collectedFamiliesFromData();
  const missing = collectedFamilies.filter((family) => !FAMILY_TO_PANEL.some((item) => item.family === family));
  const extras = [...assigned].filter((family) => !collectedFamilies.includes(family));
  const stale = COLLECTED_FAMILIES.filter((family) => !collectedFamilies.includes(family));

  if (missing.length > 0 || extras.length > 0 || stale.length > 0) {
    throw new Error(
      `Adoption signal family coverage mismatch: missing=${missing.join(",") || "none"}; extras=${
        extras.join(",") || "none"
      }; stale=${stale.join(",") || "none"}`,
    );
  }
}

function sourceFromObject(source: RawSourceObject, capturedAt?: string): SourceRef {
  return {
    name: source.name,
    publisher: source.publisher,
    url: source.url,
    dataset: source.dataset,
    capturedAt,
  };
}

function stringSource(name: string, url: string, capturedAt?: string): SourceRef {
  return { name, url, capturedAt };
}

function geoCode(geo: RawGeo): string {
  return geo.iso3 ?? geo.code ?? geo.name;
}

function caveatFor(comparability?: string): string {
  return comparability ?? GENERIC_CAVEAT;
}

function uniqueSummary(values: string[]): string {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length === 0) return "Not specified";
  if (unique.length <= 3) return unique.join("; ");
  return `${unique.slice(0, 3).join("; ")} +${unique.length - 3} more`;
}

function compact(value: number, thousand: string, million: string, billion: string, trillion = "T"): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${trimDecimal(value / 1_000_000_000_000)}${trillion}`;
  if (abs >= 1_000_000_000) return `${trimDecimal(value / 1_000_000_000)}${billion}`;
  if (abs >= 1_000_000) return `${trimDecimal(value / 1_000_000)}${million}`;
  if (abs >= 1_000) return `${trimDecimal(value / 1_000)}${thousand}`;
  return Number.isInteger(value) ? value.toLocaleString("en-US") : trimDecimal(value);
}

function trimDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatSignalValue(value: number, unit: string): string {
  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit.includes("percent")) return `${value.toFixed(1)}%`;
  if (normalizedUnit.includes("download")) return compact(value, "K", "M", "B");
  if (normalizedUnit.includes("monthly_active_users") || normalizedUnit === "users" || normalizedUnit.includes("mau")) {
    return compact(value, "K", "M", "B");
  }
  if (normalizedUnit.includes("stars") || normalizedUnit.includes("forks")) return compact(value, "K", "M", "B");
  if (normalizedUnit.includes("publication")) {
    return Math.abs(value) >= 100_000 ? compact(value, "K", "M", "B") : Math.round(value).toLocaleString("en-US");
  }
  if (normalizedUnit.includes("token")) return compact(value, "K", "M", "B", "T");
  if (normalizedUnit.includes("potential_metrics")) {
    return `${value.toLocaleString("en-US")} potential metric${value === 1 ? "" : "s"}`;
  }

  return Number.isInteger(value) ? value.toLocaleString("en-US") : trimDecimal(value);
}

function buildValue(args: {
  id: string;
  label: string;
  value: number;
  unit: string;
  period: string;
  source: SourceRef;
  confidence?: string;
  comparability?: string;
  geography?: string;
  meta?: SignalValueMeta;
}): SignalValue {
  return {
    ...args,
    formattedValue: formatSignalValue(args.value, args.unit),
  };
}

function buildEnterprisePanel(topN: number): SignalPanel {
  const values = data.enterpriseAdoptionMetrics
    .flatMap((metric) =>
      metric.countries.map((country) =>
        buildValue({
          id: `${metric.id}-${geoCode(country.geo)}`,
          label: `${country.geo.name} (${metric.source.publisher ?? metric.source.name})`,
          value: country.value,
          unit: metric.unit,
          period: country.period ?? metric.period,
          source: sourceFromObject(metric.source),
          confidence: metric.confidence,
          comparability: metric.comparability,
          geography: country.geo.name,
          meta: { metric: metric.metric, population: metric.population, status: country.status },
        }),
      ),
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);

  const benchmarks = data.enterpriseAdoptionMetrics.flatMap((metric) =>
    (metric.regionalAggregates ?? []).map((aggregate) =>
      buildValue({
        id: `${metric.id}-benchmark-${geoCode(aggregate.geo)}`,
        label: `${aggregate.geo.name} (${metric.source.publisher ?? metric.source.name})`,
        value: aggregate.value,
        unit: metric.unit,
        period: aggregate.period ?? metric.period,
        source: sourceFromObject(metric.source),
        confidence: metric.confidence,
        comparability: metric.comparability,
        geography: aggregate.geo.name,
        meta: { metric: metric.metric, population: metric.population, status: aggregate.status },
      }),
    ),
  );

  return panel({
    id: "enterprise",
    titleKey: "adoptEnterpriseTitle",
    descriptionKey: "adoptEnterpriseDescription",
    family: "enterpriseAdoptionMetrics",
    kind: "bar-list",
    unit: "percent_of_enterprises",
    caveat: caveatFor(data.enterpriseAdoptionMetrics[0]?.comparability),
    values,
    benchmarks,
  });
}

function buildIndividualPanel(topN: number): SignalPanel {
  const values = data.individualGenerativeAIUsageMetrics
    .flatMap((metric) =>
      metric.countries.map((country) =>
        buildValue({
          id: `${metric.id}-${geoCode(country.geo)}`,
          label: country.geo.name,
          value: country.value,
          unit: metric.unit,
          period: country.period ?? metric.period,
          source: sourceFromObject(metric.source),
          confidence: metric.confidence,
          comparability: metric.comparability,
          geography: country.geo.name,
          meta: { metric: metric.metric, population: metric.population, status: country.status },
        }),
      ),
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);

  const benchmarks = data.individualGenerativeAIUsageMetrics.flatMap((metric) =>
    (metric.regionalAggregates ?? []).map((aggregate) =>
      buildValue({
        id: `${metric.id}-benchmark-${geoCode(aggregate.geo)}`,
        label: aggregate.geo.name,
        value: aggregate.value,
        unit: metric.unit,
        period: aggregate.period ?? metric.period,
        source: sourceFromObject(metric.source),
        confidence: metric.confidence,
        comparability: metric.comparability,
        geography: aggregate.geo.name,
        meta: { metric: metric.metric, population: metric.population, status: aggregate.status },
      }),
    ),
  );

  return panel({
    id: "individual",
    titleKey: "adoptIndividualTitle",
    descriptionKey: "adoptIndividualDescription",
    family: "individualGenerativeAIUsageMetrics",
    kind: "bar-list",
    unit: "percent_of_population",
    caveat: caveatFor(data.individualGenerativeAIUsageMetrics[0]?.comparability),
    values,
    benchmarks,
  });
}

function buildUsBusinessPanel(topN: number): SignalPanel {
  const metric = data.usCensusBusinessAIMetrics[0];
  const values = metric
    ? [
        buildValue({
          id: `${metric.id}-national`,
          label: `${metric.national.geo.name} (2018 pre-GenAI ABS)`,
          value: metric.national.percentOfEmployerFirms,
          unit: "percent_of_employer_firms",
          period: metric.period,
          source: sourceFromObject(metric.source),
          confidence: metric.confidence,
          comparability: metric.comparability,
          geography: metric.national.geo.name,
          meta: { metric: metric.metric, population: metric.population, firms: metric.national.firms },
        }),
        ...metric.states
          .map((state) =>
            buildValue({
              id: `${metric.id}-state-${geoCode(state.geo)}`,
              label: `${state.geo.name} (2018 pre-GenAI ABS)`,
              value: state.percentOfEmployerFirms,
              unit: "percent_of_employer_firms",
              period: metric.period,
              source: sourceFromObject(metric.source),
              confidence: metric.confidence,
              comparability: metric.comparability,
              geography: state.geo.name,
              meta: { metric: metric.metric, population: metric.population, firms: state.firms },
            }),
          )
          .sort((a, b) => b.value - a.value)
          .slice(0, topN),
      ]
    : [];

  return panel({
    id: "usBusiness",
    titleKey: "adoptUsBusinessTitle",
    descriptionKey: "adoptUsBusinessDescription",
    family: "usCensusBusinessAIMetrics",
    kind: "kpi-grid",
    unit: "percent_of_employer_firms",
    caveat: metric ? `${caveatFor(metric.comparability)} 2018 pre-GenAI ABS.` : GENERIC_CAVEAT,
    values,
  });
}

function buildCountrySurveyPanel(): SignalPanel {
  const values = data.countrySurveyMetrics.map((metric) =>
    buildValue({
      id: metric.id,
      label: `${metric.geo.name} — ${metric.metric}`,
      value: metric.value,
      unit: metric.unit,
      period: metric.period,
      source: sourceFromObject(metric.source),
      confidence: metric.confidence,
      comparability: metric.comparability,
      geography: metric.geo.name,
      meta: { metric: metric.metric, population: metric.population },
    }),
  );

  return panel({
    id: "countrySurvey",
    titleKey: "adoptCountrySurveyTitle",
    descriptionKey: "adoptCountrySurveyDescription",
    family: "countrySurveyMetrics",
    kind: "kpi-grid",
    unit: "mixed",
    caveat: caveatFor(data.countrySurveyMetrics[0]?.comparability),
    values,
  });
}

function isMauUnit(unit: string): boolean {
  const normalizedUnit = unit.toLowerCase();
  return normalizedUnit === "users" || normalizedUnit.includes("monthly_active_users") || normalizedUnit.includes("mau");
}

function buildChinaAppsPanels(): SignalPanel[] {
  const values = data.chinaAppMarketMetrics.map((metric) =>
    buildValue({
      id: metric.id,
      label: metric.metric,
      value: metric.value,
      unit: metric.unit,
      period: metric.period,
      source: sourceFromObject(metric.source),
      confidence: metric.confidence,
      comparability: metric.comparability,
      geography: metric.geo.name,
      meta: { metric: metric.metric, population: metric.population },
    }),
  );

  const mauValues = values.filter((value) => isMauUnit(value.unit)).sort((a, b) => b.value - a.value);
  const usageValues = values.filter((value) => !isMauUnit(value.unit));

  return [
    panel({
      id: "chinaAppsMau",
      titleKey: "adoptChinaAppsMauTitle",
      descriptionKey: "adoptChinaAppsMauDescription",
      family: "chinaAppMarketMetrics",
      kind: mauValues.length > 1 ? "bar-list" : "kpi-grid",
      unit: "monthly_active_users",
      caveat: "China app-market MAU categories may overlap and cannot be summed.",
      values: mauValues,
    }),
    panel({
      id: "chinaAppsUsage",
      titleKey: "adoptChinaAppsUsageTitle",
      descriptionKey: "adoptChinaAppsUsageDescription",
      family: "chinaAppMarketMetrics",
      kind: "kpi-grid",
      unit: "mixed",
      caveat: "Usage-volume app-market proxies use units such as tokens and are not directly comparable with MAU rows.",
      values: usageValues,
    }),
  ].filter((signalPanel) => signalPanel.values.length > 0);
}

function buildChinaNativePanel(): SignalPanel {
  const values = data.chinaNativeAppMau
    .map((metric) =>
      buildValue({
        id: metric.id,
        label: metric.product,
        value: metric.value,
        unit: metric.unit,
        period: metric.period,
        source: sourceFromObject(metric.source),
        confidence: metric.confidence,
        comparability: metric.comparability,
        geography: metric.geo.name,
        meta: { metric: metric.metric },
      }),
    )
    .sort((a, b) => b.value - a.value);

  return panel({
    id: "chinaNative",
    titleKey: "adoptChinaNativeTitle",
    descriptionKey: "adoptChinaNativeDescription",
    family: "chinaNativeAppMau",
    kind: "kpi-grid",
    unit: "users",
    caveat: caveatFor(data.chinaNativeAppMau[0]?.comparability),
    values,
  });
}

function buildDeveloperSurveyPanels(topN: number): SignalPanel[] {
  const metric = data.developerSurveyMetrics[0];
  const overallValues = metric
    ? metric.overall.flatMap((question) =>
        question.distribution.map((entry) =>
          buildValue({
            id: `${metric.id}-${question.question}-${slug(entry.label)}`,
            label: `${question.question}: ${entry.label}`,
            value: entry.percent,
            unit: "percent_of_survey_responses",
            period: metric.period,
            source: sourceFromObject(metric.source),
            confidence: metric.confidence,
            comparability: metric.comparability,
            meta: {
              metric: metric.metric,
              population: metric.population,
              responses: question.responses,
              count: entry.count,
              percent: entry.percent,
            },
          }),
        ),
      )
    : [];
  const countryValues = metric
    ? metric.countries
        .map((country) =>
          buildValue({
            id: `${metric.id}-country-${slug(country.country)}`,
            label: `${country.country} respondent share`,
            value: country.yesPercent,
            unit: "percent_of_survey_responses",
            period: metric.period,
            source: sourceFromObject(metric.source),
            confidence: metric.confidence,
            comparability: metric.comparability,
            geography: country.country,
            meta: { metric: metric.metric, population: metric.population, responses: country.responses },
          }),
        )
        .sort((a, b) => b.value - a.value)
        .slice(0, topN)
    : [];

  return [
    panel({
      id: "developerSurveyOverall",
      titleKey: "adoptDeveloperSurveyOverallTitle",
      descriptionKey: "adoptDeveloperSurveyOverallDescription",
      family: "developerSurveyMetrics",
      kind: "bar-list",
      unit: "percent_of_survey_responses",
      caveat: metric ? `${caveatFor(metric.comparability)} Overall distributions keep each survey question separate.` : GENERIC_CAVEAT,
      values: overallValues,
    }),
    panel({
      id: "developerSurveyCountries",
      titleKey: "adoptDeveloperSurveyCountriesTitle",
      descriptionKey: "adoptDeveloperSurveyCountriesDescription",
      family: "developerSurveyMetrics",
      kind: countryValues.length > 1 ? "bar-list" : "kpi-grid",
      unit: "percent_of_survey_responses",
      caveat: metric ? `${caveatFor(metric.comparability)} Country rows are respondent shares, not population adoption.` : GENERIC_CAVEAT,
      values: countryValues,
    }),
  ].filter((signalPanel) => signalPanel.values.length > 0);
}

function buildOpenModelsPanel(): SignalPanel {
  const values = data.openModelDownloadProxies
    .map((provider) => {
      const downloads = provider.entries.reduce((total, entry) => total + entry.downloads, 0);
      const likes = provider.entries.reduce((total, entry) => total + entry.likes, 0);

      return buildValue({
        id: `open-models-${slug(provider.provider)}`,
        label: provider.provider,
        value: downloads,
        unit: "downloads",
        period: provider.capturedAt,
        source: stringSource(`Hugging Face API — ${provider.provider}`, provider.source, provider.capturedAt),
        comparability: provider.comparability,
        meta: {
          metric: provider.metric,
          provider: provider.provider,
          downloads,
          likes,
          entries: provider.entries.map((entry) => ({
            ...entry,
            formattedValue: formatSignalValue(entry.downloads, "downloads"),
          })),
          capturedAt: provider.capturedAt,
        },
      });
    })
    .sort((a, b) => b.value - a.value);

  return panel({
    id: "openModels",
    titleKey: "adoptOpenModelsTitle",
    descriptionKey: "adoptOpenModelsDescription",
    family: "openModelDownloadProxies",
    kind: "provider-models",
    unit: "downloads",
    caveat: caveatFor(data.openModelDownloadProxies[0]?.comparability),
    values,
  });
}

function buildDevEcosystemPanel(): SignalPanel {
  const values = data.developerEcosystemProxies.flatMap((repo) => {
    const source = stringSource(`GitHub API — ${repo.repository}`, repo.source, repo.capturedAt);
    const common = {
      period: repo.repositoryUpdatedAt,
      source,
      confidence: repo.confidence,
      comparability: repo.comparability,
      meta: {
        metric: repo.metric,
        repository: repo.repository,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        updatedAt: repo.repositoryUpdatedAt,
        capturedAt: repo.capturedAt,
        formattedStars: formatSignalValue(repo.stars, "stars"),
        formattedForks: formatSignalValue(repo.forks, "forks"),
        formattedOpenIssues: formatSignalValue(repo.openIssues, "open_issues"),
      },
    };

    return [
      buildValue({ id: `${repo.id}-stars`, label: `${repo.repository} stars`, value: repo.stars, unit: "stars", ...common }),
      buildValue({ id: `${repo.id}-forks`, label: `${repo.repository} forks`, value: repo.forks, unit: "forks", ...common }),
      buildValue({
        id: `${repo.id}-open-issues`,
        label: `${repo.repository} open issues`,
        value: repo.openIssues,
        unit: "open_issues",
        ...common,
      }),
    ];
  });

  return panel({
    id: "devEcosystem",
    titleKey: "adoptDevEcosystemTitle",
    descriptionKey: "adoptDevEcosystemDescription",
    family: "developerEcosystemProxies",
    kind: "repo-kpis",
    unit: "repository_activity",
    caveat: caveatFor(data.developerEcosystemProxies[0]?.comparability),
    values,
  });
}

function buildResearchPanel(topN: number): SignalPanel {
  const values = data.aiResearchActivityMetrics
    .flatMap((metric) =>
      metric.countries.map((country) =>
        buildValue({
          id: `${metric.id}-${geoCode(country.geo)}`,
          label: country.geo.name,
          value: country.value,
          unit: "publications_count",
          period: country.period ?? metric.period,
          source: sourceFromObject(metric.source),
          confidence: metric.confidence,
          comparability: metric.comparability,
          geography: country.geo.name,
          meta: { metric: metric.metric, population: metric.population, status: country.status },
        }),
      ),
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);

  return panel({
    id: "research",
    titleKey: "adoptResearchTitle",
    descriptionKey: "adoptResearchDescription",
    family: "aiResearchActivityMetrics",
    kind: "bar-list",
    unit: "publications_count",
    caveat: "Research activity proxy, not adoption by firms or individuals.",
    values,
  });
}

function buildFutureSourcesPanel(): SignalPanel {
  const values = data.sourceCatalogForFutureCollection.map((source) =>
    buildValue({
      id: `future-source-${slug(source.name)}`,
      label: source.name,
      value: source.potentialMetrics.length,
      unit: "potential_metrics",
      period: data.generatedAt,
      source: { name: source.name, url: source.source },
      comparability: source.reason,
      meta: {
        potentialMetrics: source.potentialMetrics,
        reason: source.reason,
        sourceStatus: source.status,
        sourceUrl: source.source,
      },
    }),
  );

  return panel({
    id: "future-sources",
    titleKey: "adoptFutureSourcesTitle",
    descriptionKey: "adoptFutureSourcesDescription",
    family: "sourceCatalogForFutureCollection",
    kind: "future-sources",
    unit: "potential_metrics",
    caveat: "Future collection catalog; listed sources are not charted adoption metrics.",
    values,
  });
}

function panel(args: Omit<SignalPanel, "sourceSummary" | "periodSummary">): SignalPanel {
  return {
    ...args,
    sourceSummary: uniqueSummary(args.values.map((value) => value.source.publisher ?? value.source.name)),
    periodSummary: uniqueSummary(args.values.map((value) => value.period)),
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getAdoptionSignalCoverage(): AdoptionSignalsDataset["coverage"] {
  assertAdoptionSignalCoverage();

  return clone({
    collectedFamilies: collectedFamiliesFromData(),
    visualizedFamilies: [...new Set(FAMILY_TO_PANEL.map((item) => item.family))],
    futureCatalogCount: data.sourceCatalogForFutureCollection.length,
  });
}

export function getAdoptionSignals(options: { topN?: number } = {}): AdoptionSignalsDataset {
  assertAdoptionSignalCoverage();

  const topN = Math.max(1, Math.floor(options.topN ?? DEFAULT_TOP_N));
  const dataset: AdoptionSignalsDataset = {
    generatedAt: data.generatedAt,
    scope: data.scope,
    caveat: data.caveat,
    panels: [
      buildEnterprisePanel(topN),
      buildIndividualPanel(topN),
      buildUsBusinessPanel(topN),
      buildCountrySurveyPanel(),
      ...buildChinaAppsPanels(),
      buildChinaNativePanel(),
      ...buildDeveloperSurveyPanels(topN),
      buildOpenModelsPanel(),
      buildDevEcosystemPanel(),
      buildResearchPanel(topN),
      buildFutureSourcesPanel(),
    ],
    coverage: getAdoptionSignalCoverage(),
  };

  return clone(dataset);
}
