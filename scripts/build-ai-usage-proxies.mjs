#!/usr/bin/env node
/**
 * build-ai-usage-proxies.mjs
 * Fetches supplemental AI usage/adoption proxy metrics and writes data/ai-usage-proxies.json.
 * Run: node scripts/build-ai-usage-proxies.mjs
 */

import { writeFileSync } from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(DATA_DIR, "ai-usage-proxies.json");
const UA = "FutureGrid-data-bot/1.0 (https://github.com/huangyingting/FutureGrid)";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows.filter((entry) => entry.some((value) => value !== ""));
  if (!headers) return [];

  return records.map((record) => {
    const object = {};
    for (let index = 0; index < headers.length; index++) {
      object[headers[index]] = record[index] ?? "";
    }
    return object;
  });
}

function censusRowsToObjects(rows) {
  const [headers, ...records] = rows;
  if (!headers) return [];
  return records.map((record) => Object.fromEntries(headers.map((key, index) => [key, record[index] ?? null])));
}

async function fetchText(url, label, options = {}) {
  console.log(`  [fetch] ${label}`);
  const attempts = options.attempts ?? 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, ...(options.headers ?? {}) },
        signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
      });
      if (!response.ok) throw new Error(`${label}: HTTP ${response.status} ${response.statusText}`);
      return response.text();
    } catch (error) {
      if (attempt === attempts) {
        if (url.startsWith("https://api.census.gov/")) {
          return fetchTextWithHttps(url, label, options);
        }
        throw error;
      }
      console.warn(`  ⚠ ${label} attempt ${attempt} failed; retrying ...`);
      await sleep(1_500 * attempt);
    }
  }
  throw new Error(`${label}: failed after ${attempts} attempts`);
}

async function fetchJson(url, label, options = {}) {
  const text = await fetchText(url, label, options);
  return JSON.parse(text);
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchTextWithHttps(url, label, options = {}) {
  console.log(`  [fetch] ${label} via node:https`);
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      family: 4,
      timeout: options.timeoutMs ?? 45_000,
      headers: { "User-Agent": UA, ...(options.headers ?? {}) },
    }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          reject(new Error(`${label}: HTTP ${response.statusCode}`));
          return;
        }
        resolve(text);
      });
    });
    request.on("timeout", () => request.destroy(new Error(`${label}: request timed out`)));
    request.on("error", reject);
  });
}

async function buildEurostatEnterpriseAdoption() {
  const apiUrl = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/isoc_eb_ai?lang=en&time=2024&size_emp=GE10&nace_r2=C10-S951_X_K&indic_is=E_AI_TANY&unit=PC_ENT";
  const json = await fetchJson(apiUrl, "Eurostat enterprise AI adoption 2024");
  const geo = json.dimension.geo.category;
  const entries = Object.entries(geo.index)
    .map(([code, index]) => ({ geo: { code, name: geo.label[code] }, value: json.value?.[index] }))
    .filter((entry) => typeof entry.value === "number");

  const aggregateCodes = new Set(["EU27_2020", "EA"]);
  const regionalAggregates = entries
    .filter((entry) => aggregateCodes.has(entry.geo.code))
    .sort((a, b) => a.geo.code.localeCompare(b.geo.code));
  const countries = entries
    .filter((entry) => !aggregateCodes.has(entry.geo.code))
    .sort((a, b) => a.geo.code.localeCompare(b.geo.code));

  return {
    id: "eurostat-enterprise-ai-any-2024",
    metric: "enterprises_using_at_least_one_ai_technology",
    unit: "percent_of_enterprises",
    period: "2024",
    population: "Enterprises with 10 persons employed or more; all activities except agriculture, forestry and fishing, mining and quarrying, and the financial sector.",
    source: {
      name: "Eurostat — Artificial intelligence by size class of enterprise",
      publisher: "Eurostat",
      dataset: "isoc_eb_ai",
      url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_eb_ai/default/table?lang=en",
      apiUrl,
      updated: json.updated,
    },
    confidence: "high",
    comparability: "Enterprise adoption survey metric; comparable across listed European reporting countries, but not comparable to consumer MAU or Anthropic Claude.ai usageIndex.",
    regionalAggregates,
    countries,
  };
}

function buildOecdCsvMetric({ id, metric, label, apiUrl, dataset, period, population, comparability }) {
  return async () => {
    const text = await fetchText(apiUrl, label);
    const rows = parseCSV(text)
      .filter((row) => row.OBS_VALUE)
      .map((row) => ({
        geo: { code: row.REF_AREA, name: row["Reference area"] },
        period: row.TIME_PERIOD,
        value: round(Number(row.OBS_VALUE), 4),
        status: row["Observation status"] || row.OBS_STATUS || null,
      }))
      .filter((row) => Number.isFinite(row.value));

    const regionalCodes = new Set(["OECD", "EA", "EU27_2020", "W", "WXOECD"]);
    const regionalAggregates = rows
      .filter((row) => regionalCodes.has(row.geo.code))
      .sort((a, b) => a.geo.code.localeCompare(b.geo.code));
    const countries = rows
      .filter((row) => !regionalCodes.has(row.geo.code))
      .sort((a, b) => a.geo.code.localeCompare(b.geo.code));

    return {
      id,
      metric,
      unit: dataset.unit,
      period,
      population,
      source: {
        name: dataset.name,
        publisher: "OECD",
        dataset: dataset.id,
        measure: dataset.measure,
        url: dataset.url,
        apiUrl,
      },
      confidence: "high",
      comparability,
      regionalAggregates,
      countries,
    };
  };
}

const buildOecdBusinessAIAdoption = buildOecdCsvMetric({
  id: "oecd-businesses-using-ai-2025",
  metric: "businesses_using_artificial_intelligence",
  label: "OECD businesses using AI 2025",
  apiUrl: "https://sdmx.oecd.org/public/rest/data/OECD.STI.DEP,DSD_ICT_B@DF_BUSINESSES/.A.G14_B.._T.S_GE10?startPeriod=2025&endPeriod=2025&dimensionAtObservation=AllDimensions&format=csvfilewithlabels",
  period: "2025",
  population: "Businesses with 10 or more persons employed; total activities.",
  dataset: {
    name: "OECD ICT Access and Usage by Businesses",
    id: "DSD_ICT_B@DF_BUSINESSES",
    measure: "G14_B — Businesses using artificial intelligence (AI)",
    unit: "percent_of_enterprises",
    url: "https://data-explorer.oecd.org/vis?df[ds]=DisseminateFinalDMZ&df[id]=DSD_ICT_B@DF_BUSINESSES&df[ag]=OECD.STI.DEP",
  },
  comparability: "Enterprise adoption survey metric; partially harmonised via OECD/Eurostat ICT survey methodology, not comparable to consumer MAU or Anthropic usageIndex.",
});

const buildOecdIndividualGenAIUse = buildOecdCsvMetric({
  id: "oecd-individuals-using-generative-ai-2025",
  metric: "individuals_using_generative_ai_tools_last_3_months",
  label: "OECD individuals using generative AI tools 2025",
  apiUrl: "https://sdmx.oecd.org/public/rest/data/OECD.STI.DEP,DSD_ICT_HH_IND@DF_IND/.A.D1X_I...Y16T74._T._T._T._T?startPeriod=2025&endPeriod=2025&dimensionAtObservation=AllDimensions&format=csvfilewithlabels",
  period: "2025",
  population: "Individuals aged 16-74; total sex, education, income, and employment-status breakdowns.",
  dataset: {
    name: "OECD ICT Access and Usage by Individuals",
    id: "DSD_ICT_HH_IND@DF_IND",
    measure: "D1X_I — Individuals using the internet for using generative AI tools - last 3 months",
    unit: "percent_of_population",
    url: "https://data-explorer.oecd.org/vis?df[ds]=DisseminateFinalDMZ&df[id]=DSD_ICT_HH_IND@DF_IND&df[ag]=OECD.STI.DEP",
  },
  comparability: "Individual generative-AI usage survey metric; comparable across listed OECD/partner reporting countries, not comparable to enterprise adoption or product MAU.",
});

async function buildUsCensusBusinessAIMetrics() {
  const key = process.env.CENSUS_API_KEY;
  if (!key) {
    console.log("  [skip] Census ABS AI adoption (CENSUS_API_KEY not set)");
    return [];
  }

  let nationalRows;
  let stateRows;
  try {
    const baseUrl = "https://api.census.gov/data/2018/abstcb";
    const common = "get=NAME,NAICS2017_LABEL,TECHUSE,TECHUSE_LABEL,FIRMPDEMP,FIRMPDEMP_PCT&NAICS2017=00&TECHUSE=T1E03B99";
    nationalRows = censusRowsToObjects(await fetchJson(`${baseUrl}?${common}&for=us:*&key=${encodeURIComponent(key)}`, "Census ABS AI adoption 2018 (national)", { timeoutMs: 45_000 }));
    stateRows = censusRowsToObjects(await fetchJson(`${baseUrl}?${common}&for=state:*&key=${encodeURIComponent(key)}`, "Census ABS AI adoption 2018 (states)", { timeoutMs: 45_000 }));
  } catch (error) {
    console.warn(`  ⚠ Census ABS AI adoption skipped: ${error.message}`);
    return [];
  }

  const national = nationalRows[0]
    ? {
        geo: { code: "USA", name: nationalRows[0].NAME },
        firms: Number(nationalRows[0].FIRMPDEMP),
        percentOfEmployerFirms: Number(nationalRows[0].FIRMPDEMP_PCT),
      }
    : null;

  const states = stateRows
    .map((row) => ({
      geo: { code: row.state, name: row.NAME },
      firms: Number(row.FIRMPDEMP),
      percentOfEmployerFirms: Number(row.FIRMPDEMP_PCT),
    }))
    .filter((row) => Number.isFinite(row.firms) && Number.isFinite(row.percentOfEmployerFirms))
    .sort((a, b) => a.geo.code.localeCompare(b.geo.code));

  return [
    {
      id: "us-census-abs-ai-total-use-2018",
      metric: "employer_firms_using_artificial_intelligence_total_use",
      unit: "firms_and_percent_of_employer_firms",
      period: "2018",
      population: "Employer firms, total for all sectors (NAICS2017=00). TECHUSE=T1E03B99 means Artificial Intelligence: Total use.",
      source: {
        name: "U.S. Census Annual Business Survey — Technology Characteristics of Businesses",
        publisher: "U.S. Census Bureau",
        dataset: "2018/abstcb",
        url: "https://api.census.gov/data/2018/abstcb.html",
      },
      confidence: "high",
      comparability: "U.S. employer-firm technology-use survey metric from 2018; predates the generative-AI wave and is not comparable to 2025 generative-AI usage surveys.",
      national,
      states,
    },
  ];
}

async function fetchHuggingFaceModels(provider, search) {
  const source = `https://huggingface.co/api/models?search=${encodeURIComponent(search)}&sort=downloads&direction=-1&limit=5`;
  const models = await fetchJson(source, `Hugging Face models: ${provider}`);
  return {
    provider,
    capturedAt: new Date().toISOString(),
    source,
    metric: "huggingface_model_downloads",
    entries: models.map((model) => ({
      modelId: model.id,
      downloads: model.downloads ?? 0,
      likes: model.likes ?? 0,
    })),
    comparability: "Developer/open-model proxy; not consumer app usage.",
  };
}

async function fetchGithubRepoProxy() {
  const headers = {};
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repo = await fetchJson("https://api.github.com/repos/huggingface/transformers", "GitHub repo: huggingface/transformers", { headers });
  return {
    id: "github-huggingface-transformers",
    metric: "github_repository_activity",
    repository: repo.full_name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    repositoryUpdatedAt: repo.updated_at,
    capturedAt: new Date().toISOString(),
    source: "https://api.github.com/repos/huggingface/transformers",
    confidence: "high",
    comparability: "Developer ecosystem proxy; no country split and no end-user usage measurement.",
  };
}

function buildStaticChinaSurveyMetrics() {
  const source = {
    name: "China's generative AI users double to 515 mln: report",
    publisher: "Xinhua / State Council of the People's Republic of China",
    url: "https://english.www.gov.cn/archive/statistics/202510/18/content_WS68f30556c6d00ca5f9a06e05.html",
    primaryUnderlyingSource: "China Internet Network Information Center (CNNIC)",
  };
  return [
    {
      id: "cn-cnnic-genai-users-2025-06",
      geo: { iso3: "CHN", name: "China" },
      metric: "generative_ai_users",
      value: 515000000,
      unit: "users",
      period: "2025-06",
      source,
      confidence: "high",
      comparability: "Country survey/user-base metric; not directly comparable to Anthropic Claude.ai usageIndex.",
    },
    {
      id: "cn-cnnic-genai-penetration-2025-06",
      geo: { iso3: "CHN", name: "China" },
      metric: "generative_ai_user_penetration",
      value: 36.5,
      unit: "percent_of_population",
      period: "2025-06",
      source,
      confidence: "high",
      comparability: "Penetration survey metric; not a per-product activity count.",
    },
    {
      id: "cn-cnnic-genai-user-growth-2024-12-to-2025-06",
      geo: { iso3: "CHN", name: "China" },
      metric: "generative_ai_users_increase",
      value: 266000000,
      unit: "users",
      period: "2024-12_to_2025-06",
      source,
      confidence: "high",
      comparability: "Growth in broad user base; not product-level usage.",
    },
  ];
}

function buildStaticChinaAppMarketMetrics() {
  const source = {
    name: "QuestMobile 2025 AI Application Market Half-Year Report",
    publisher: "QuestMobile",
    url: "https://www.questmobile.com.cn/research/report/1952664347667959809/",
  };
  return [
    ["cn-questmobile-mobile-ai-app-users-2025-06", "mobile_ai_application_users", 680000000, "monthly_active_users", "Market/category MAU; likely includes overlapping users across AI application forms."],
    ["cn-questmobile-ai-search-users-2025-06", "ai_search_track_users", 685000000, "monthly_active_users", "Category-scale MAU; overlaps with other categories and cannot be summed."],
    ["cn-questmobile-ai-assistant-users-2025-06", "ai_comprehensive_assistant_track_users", 612000000, "monthly_active_users", "Category-scale MAU; overlaps with AI search and app/plugin usage."],
    ["cn-questmobile-ai-token-consumption-2025-06", "ai_application_token_consumption", 1163000000000000, "tokens", "Token-volume estimate; not comparable to user-count metrics."],
  ].map(([id, metric, value, unit, comparability]) => ({
    id,
    geo: { iso3: "CHN", name: "China" },
    metric,
    value,
    unit,
    period: "2025-H1_or_2025-06_reported",
    source,
    confidence: unit === "tokens" ? "medium" : "medium_high",
    comparability,
  })).concat({
    id: "cn-questmobile-top-internet-groups-token-consumption-2025-06",
    geo: { iso3: "CHN", name: "China" },
    metric: "top_five_internet_groups_token_consumption",
    value: 603000000000000,
    shareOfTotal: 51.8,
    unit: "tokens",
    period: "2025-H1_or_2025-06_reported",
    source,
    confidence: "medium",
    comparability: "Concentration/volume estimate; not user adoption.",
  });
}

function buildStaticChinaNativeAppMau() {
  const source = {
    name: "QuestMobile 2025 AI Application Ranking report coverage",
    publisher: "Guancha, citing QuestMobile",
    url: "https://www.guancha.cn/economy/2026_03_03_808630.shtml",
    primaryUnderlyingSource: "QuestMobile 2025 AI Application Layer Development Core Report",
  };
  return [
    { id: "cn-questmobile-doubao-mau-2025-12", product: "Doubao", value: 226000000 },
    { id: "cn-questmobile-deepseek-mau-2025-12", product: "DeepSeek", value: 135000000 },
  ].map((entry) => ({
    id: entry.id,
    geo: { iso3: "CHN", name: "China" },
    product: entry.product,
    metric: "monthly_active_users",
    value: entry.value,
    unit: "users",
    period: "2025-12",
    source,
    confidence: "medium",
    comparability: "Product MAU for a China-native AI app; not comparable to Anthropic country usageIndex.",
  }));
}

function buildSourceCatalog(censusCollected) {
  return [
    {
      name: "Similarweb",
      status: "not_collected",
      reason: "Useful for web traffic and country share across AI products, but detailed API access is commercial.",
      potentialMetrics: ["website_visits", "country_traffic_share", "engagement"],
    },
    {
      name: "Sensor Tower / data.ai / AppMagic",
      status: "not_collected",
      reason: "Useful for mobile AI app downloads and MAU estimates, but high-quality country-level data is generally commercial.",
      potentialMetrics: ["mobile_downloads", "mobile_mau", "country_rank"],
    },
    {
      name: "Google Trends",
      status: "not_collected",
      reason: "Search-interest proxy is accessible manually but has no official stable public API for production collection.",
      potentialMetrics: ["relative_search_interest_by_country", "time_series_interest"],
    },
    {
      name: "US Census Annual Business Survey Technology Characteristics",
      status: censusCollected ? "collected" : "requires_api_key",
      reason: censusCollected
        ? "Collected from Census ABS 2018 abstcb with TECHUSE=T1E03B99."
        : "Set CENSUS_API_KEY to collect US employer-firm AI adoption data from Census ABS 2018 abstcb.",
      potentialMetrics: ["business_ai_use", "state_split", "industry_split"],
    },
    {
      name: "OECD ICT Access and Usage Database",
      status: "collected",
      reason: "Collected businesses using AI (G14_B) and individuals using generative AI tools (D1X_I) via OECD SDMX API.",
      source: "https://data-explorer.oecd.org/",
      potentialMetrics: ["business_ai_use", "individual_generative_ai_use", "country_split"],
    },
    {
      name: "Stack Overflow Developer Survey",
      status: "not_collected",
      reason: "Survey can support developer AI-tool adoption analysis, but the current public dataset ZIP URL was not resolved in this pass.",
      potentialMetrics: ["developer_ai_tool_usage", "developer_attitudes", "country_split"],
    },
    {
      name: "CNNIC Statistical Reports",
      status: "source_identified",
      reason: "CNNIC report pages and PDFs are available; specific generative-AI figures were verified via a government-hosted Xinhua summary.",
      source: "https://www.cnnic.com.cn/IDR/ReportDownloads/",
      potentialMetrics: ["internet_users", "generative_ai_users", "penetration_rate"],
    },
  ];
}

async function main() {
  console.log("=== FutureGrid AI usage proxy pipeline ===");
  const generatedAt = new Date().toISOString();

  const eurostatEnterprise = await buildEurostatEnterpriseAdoption();
  const oecdBusiness = await buildOecdBusinessAIAdoption();
  const oecdIndividuals = await buildOecdIndividualGenAIUse();
  const usCensusBusinessAIMetrics = await buildUsCensusBusinessAIMetrics();
  const openModelDownloadProxies = await Promise.all([
    fetchHuggingFaceModels("Alibaba Qwen", "Qwen"),
    fetchHuggingFaceModels("DeepSeek", "DeepSeek"),
    fetchHuggingFaceModels("Moonshot Kimi", "Kimi"),
    fetchHuggingFaceModels("Zhipu ChatGLM", "ChatGLM"),
    fetchHuggingFaceModels("Baichuan", "Baichuan"),
  ]);
  const developerEcosystemProxies = [await fetchGithubRepoProxy()];

  const dataset = {
    generatedAt,
    scope: "Supplemental AI adoption and usage proxies outside Anthropic's Claude.ai country usage index.",
    caveat: "These metrics use different denominators and collection methods. Do not merge them into the Anthropic usageIndex without explicit normalization and labeling.",
    enterpriseAdoptionMetrics: [eurostatEnterprise, oecdBusiness],
    individualGenerativeAIUsageMetrics: [oecdIndividuals],
    usCensusBusinessAIMetrics,
    countrySurveyMetrics: buildStaticChinaSurveyMetrics(),
    chinaAppMarketMetrics: buildStaticChinaAppMarketMetrics(),
    chinaNativeAppMau: buildStaticChinaNativeAppMau(),
    openModelDownloadProxies,
    developerEcosystemProxies,
    sourceCatalogForFutureCollection: buildSourceCatalog(usCensusBusinessAIMetrics.length > 0),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`✓ Written ${OUTPUT_FILE}`);
  console.log(`  Enterprise sections: ${dataset.enterpriseAdoptionMetrics.length}`);
  console.log(`  Individual GenAI sections: ${dataset.individualGenerativeAIUsageMetrics.length}`);
  console.log(`  Census sections: ${dataset.usCensusBusinessAIMetrics.length}`);
  console.log(`  Open model groups: ${dataset.openModelDownloadProxies.length}`);
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
