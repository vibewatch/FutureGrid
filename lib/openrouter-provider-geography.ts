export type OpenRouterProviderLens = "modelPublisher" | "endpointProvider";

export type OpenRouterProviderMappingConfidence = "high" | "medium" | "low";

export interface OpenRouterCountryGeography {
  iso3: string;
  countryName: string;
  region: string;
}

export interface OpenRouterProviderReference {
  slug?: string | null;
  name?: string | null;
}

export interface OpenRouterMappedProviderGeography extends OpenRouterCountryGeography {
  providerName: string;
  confidence: OpenRouterProviderMappingConfidence;
  notes: string;
}

export interface OpenRouterMappedProviderResult {
  status: "mapped";
  lens: OpenRouterProviderLens;
  providerName: string;
  providerSlug: string | null;
  normalizedName: string;
  matchedKey: string;
  geography: OpenRouterMappedProviderGeography;
}

export interface OpenRouterUnmappedProviderResult {
  status: "unknown" | "ambiguous";
  lens: OpenRouterProviderLens;
  providerName: string;
  providerSlug: string | null;
  normalizedName: string;
  reason: string;
}

export type OpenRouterProviderGeographyResult =
  | OpenRouterMappedProviderResult
  | OpenRouterUnmappedProviderResult;

const COUNTRIES = {
  ARE: { iso3: "ARE", countryName: "United Arab Emirates", region: "Middle East" },
  CAN: { iso3: "CAN", countryName: "Canada", region: "North America" },
  CHN: { iso3: "CHN", countryName: "China", region: "Asia" },
  FRA: { iso3: "FRA", countryName: "France", region: "Europe" },
  ISR: { iso3: "ISR", countryName: "Israel", region: "Middle East" },
  JPN: { iso3: "JPN", countryName: "Japan", region: "Asia" },
  KOR: { iso3: "KOR", countryName: "South Korea", region: "Asia" },
  NLD: { iso3: "NLD", countryName: "Netherlands", region: "Europe" },
  USA: { iso3: "USA", countryName: "United States", region: "North America" },
} as const satisfies Record<string, OpenRouterCountryGeography>;

function mapped(
  providerName: string,
  country: OpenRouterCountryGeography,
  confidence: OpenRouterProviderMappingConfidence,
  notes = "Provider country is a curated organization/provider identity proxy.",
): OpenRouterMappedProviderGeography {
  return {
    providerName,
    confidence,
    notes,
    ...country,
  };
}

export function normalizeOpenRouterProviderKey(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^~+/, "")
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeMappingTable(
  table: Record<string, OpenRouterMappedProviderGeography>,
): Record<string, OpenRouterMappedProviderGeography> {
  return Object.fromEntries(
    Object.entries(table).map(([key, value]) => [
      normalizeOpenRouterProviderKey(key),
      value,
    ]),
  );
}

const MODEL_PUBLISHER_MAPPINGS = normalizeMappingTable({
  ai21: mapped("AI21", COUNTRIES.ISR, "high"),
  allenai: mapped("Allen Institute for AI", COUNTRIES.USA, "high"),
  amazon: mapped("Amazon", COUNTRIES.USA, "high"),
  anthropic: mapped("Anthropic", COUNTRIES.USA, "high"),
  arceeai: mapped("Arcee AI", COUNTRIES.USA, "high"),
  "arcee ai": mapped("Arcee AI", COUNTRIES.USA, "high"),
  baidu: mapped("Baidu", COUNTRIES.CHN, "high"),
  bytedance: mapped("ByteDance", COUNTRIES.CHN, "high"),
  "bytedance seed": mapped("ByteDance Seed", COUNTRIES.CHN, "high"),
  cohere: mapped("Cohere", COUNTRIES.CAN, "high"),
  deepseek: mapped("DeepSeek", COUNTRIES.CHN, "high"),
  google: mapped("Google", COUNTRIES.USA, "high"),
  "ibm granite": mapped("IBM", COUNTRIES.USA, "high"),
  ibm: mapped("IBM", COUNTRIES.USA, "high"),
  inception: mapped("Inception", COUNTRIES.ARE, "medium"),
  inceptionai: mapped("Inception", COUNTRIES.ARE, "medium"),
  inclusionai: mapped("inclusionAI", COUNTRIES.CHN, "medium"),
  inflection: mapped("Inflection", COUNTRIES.USA, "high"),
  liquid: mapped("Liquid AI", COUNTRIES.USA, "high"),
  liquidai: mapped("Liquid AI", COUNTRIES.USA, "high"),
  meta: mapped("Meta", COUNTRIES.USA, "high"),
  "meta llama": mapped("Meta", COUNTRIES.USA, "high"),
  microsoft: mapped("Microsoft", COUNTRIES.USA, "high"),
  minimax: mapped("MiniMax", COUNTRIES.CHN, "high"),
  mistral: mapped("Mistral", COUNTRIES.FRA, "high"),
  mistralai: mapped("Mistral", COUNTRIES.FRA, "high"),
  moonshotai: mapped("Moonshot AI", COUNTRIES.CHN, "high"),
  "moonshot ai": mapped("Moonshot AI", COUNTRIES.CHN, "high"),
  nvidia: mapped("NVIDIA", COUNTRIES.USA, "high"),
  openai: mapped("OpenAI", COUNTRIES.USA, "high"),
  perplexity: mapped("Perplexity", COUNTRIES.USA, "high"),
  poolside: mapped("Poolside", COUNTRIES.USA, "high"),
  qwen: mapped("Qwen", COUNTRIES.CHN, "high", "Qwen is treated as Alibaba's model family."),
  reka: mapped("Reka", COUNTRIES.USA, "high"),
  rekaai: mapped("Reka", COUNTRIES.USA, "high"),
  relace: mapped("Relace", COUNTRIES.USA, "medium"),
  sakana: mapped("Sakana AI", COUNTRIES.JPN, "high"),
  "sakana ai": mapped("Sakana AI", COUNTRIES.JPN, "high"),
  seed: mapped("ByteDance Seed", COUNTRIES.CHN, "high"),
  stepfun: mapped("StepFun", COUNTRIES.CHN, "high"),
  switchpoint: mapped("Switchpoint", COUNTRIES.USA, "medium"),
  tencent: mapped("Tencent", COUNTRIES.CHN, "high"),
  upstage: mapped("Upstage", COUNTRIES.KOR, "high"),
  writer: mapped("Writer", COUNTRIES.USA, "high"),
  "x ai": mapped("xAI", COUNTRIES.USA, "high"),
  xai: mapped("xAI", COUNTRIES.USA, "high"),
  xiaomi: mapped("Xiaomi", COUNTRIES.CHN, "high"),
  "z ai": mapped("Z.ai", COUNTRIES.CHN, "high"),
  zai: mapped("Z.ai", COUNTRIES.CHN, "high"),
});

const ENDPOINT_PROVIDER_MAPPINGS = normalizeMappingTable({
  ai21: mapped("AI21", COUNTRIES.ISR, "high"),
  akashml: mapped("AkashML", COUNTRIES.USA, "medium"),
  alibaba: mapped("Alibaba", COUNTRIES.CHN, "high"),
  amazon: mapped("Amazon Bedrock", COUNTRIES.USA, "high"),
  "amazon bedrock": mapped("Amazon Bedrock", COUNTRIES.USA, "high"),
  anthropic: mapped("Anthropic", COUNTRIES.USA, "high"),
  "arcee ai": mapped("Arcee AI", COUNTRIES.USA, "high"),
  azure: mapped("Azure", COUNTRIES.USA, "high", "Azure is treated as Microsoft's endpoint provider brand."),
  baidu: mapped("Baidu", COUNTRIES.CHN, "high"),
  baseten: mapped("BaseTen", COUNTRIES.USA, "high"),
  cerebras: mapped("Cerebras", COUNTRIES.USA, "high"),
  clarifai: mapped("Clarifai", COUNTRIES.USA, "high"),
  cloudflare: mapped("Cloudflare", COUNTRIES.USA, "high"),
  cohere: mapped("Cohere", COUNTRIES.CAN, "high"),
  deepseek: mapped("DeepSeek", COUNTRIES.CHN, "high"),
  decart: mapped("Decart", COUNTRIES.ISR, "medium"),
  digitalocean: mapped("DigitalOcean", COUNTRIES.USA, "high"),
  fireworks: mapped("Fireworks", COUNTRIES.USA, "high"),
  friendli: mapped("FriendliAI", COUNTRIES.KOR, "high"),
  google: mapped("Google", COUNTRIES.USA, "high"),
  "google ai studio": mapped("Google AI Studio", COUNTRIES.USA, "high"),
  groq: mapped("Groq", COUNTRIES.USA, "high"),
  inception: mapped("Inception", COUNTRIES.ARE, "medium"),
  inceptron: mapped("Inceptron", COUNTRIES.ARE, "low"),
  inflection: mapped("Inflection", COUNTRIES.USA, "high"),
  liquid: mapped("Liquid AI", COUNTRIES.USA, "high"),
  minimax: mapped("MiniMax", COUNTRIES.CHN, "high"),
  mistral: mapped("Mistral", COUNTRIES.FRA, "high"),
  "moonshot ai": mapped("Moonshot AI", COUNTRIES.CHN, "high"),
  morph: mapped("Morph", COUNTRIES.USA, "medium"),
  nebius: mapped("Nebius", COUNTRIES.NLD, "high"),
  nvidia: mapped("NVIDIA", COUNTRIES.USA, "high"),
  openai: mapped("OpenAI", COUNTRIES.USA, "high"),
  parasail: mapped("Parasail", COUNTRIES.USA, "medium"),
  perplexity: mapped("Perplexity", COUNTRIES.USA, "high"),
  poolside: mapped("Poolside", COUNTRIES.USA, "high"),
  reka: mapped("Reka", COUNTRIES.USA, "high"),
  relace: mapped("Relace", COUNTRIES.USA, "medium"),
  "sakana ai": mapped("Sakana AI", COUNTRIES.JPN, "high"),
  sambanova: mapped("SambaNova", COUNTRIES.USA, "high"),
  seed: mapped("ByteDance Seed", COUNTRIES.CHN, "high"),
  siliconflow: mapped("SiliconFlow", COUNTRIES.CHN, "high"),
  stepfun: mapped("StepFun", COUNTRIES.CHN, "high"),
  streamlake: mapped("StreamLake", COUNTRIES.CHN, "medium"),
  together: mapped("Together AI", COUNTRIES.USA, "high"),
  upstage: mapped("Upstage", COUNTRIES.KOR, "high"),
  "x ai": mapped("xAI", COUNTRIES.USA, "high"),
  xai: mapped("xAI", COUNTRIES.USA, "high"),
  xiaomi: mapped("Xiaomi", COUNTRIES.CHN, "high"),
  "z ai": mapped("Z.ai", COUNTRIES.CHN, "high"),
  zai: mapped("Z.ai", COUNTRIES.CHN, "high"),
});

const AMBIGUOUS_PROVIDER_REASONS: Record<
  OpenRouterProviderLens,
  Record<string, string>
> = {
  modelPublisher: Object.fromEntries(
    [
      ["openrouter", "OpenRouter-hosted catalog entries do not identify a separate model publisher country."],
      ["cognitivecomputations", "Publisher identity differs from the displayed provider brand."],
      ["venice", "Displayed brand is not enough to assign a model publisher country confidently."],
    ].map(([key, reason]) => [normalizeOpenRouterProviderKey(key), reason]),
  ),
  endpointProvider: Object.fromEntries(
    [
      ["deepinfra", "Endpoint provider footprint is not assigned because provider identity/geography is ambiguous."],
      ["novita", "Endpoint provider footprint is not assigned because provider identity/geography is ambiguous."],
      ["venice", "Endpoint provider footprint is not assigned because provider identity/geography is ambiguous."],
      ["mancer 2", "Endpoint provider footprint is not assigned because provider identity/geography is ambiguous."],
      ["io net", "Distributed endpoint provider is not assigned to one country proxy."],
      ["openinference", "Endpoint provider footprint is not assigned because provider identity/geography is ambiguous."],
    ].map(([key, reason]) => [normalizeOpenRouterProviderKey(key), reason]),
  ),
};

function providerCandidates(provider: OpenRouterProviderReference): string[] {
  const candidates = [
    normalizeOpenRouterProviderKey(provider.slug),
    normalizeOpenRouterProviderKey(provider.name),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

export function resolveOpenRouterProviderGeography(
  provider: OpenRouterProviderReference,
  lens: OpenRouterProviderLens,
): OpenRouterProviderGeographyResult {
  const providerName =
    provider.name?.trim() || provider.slug?.trim() || "Unknown provider";
  const providerSlug = provider.slug?.trim() || null;
  const normalizedName = normalizeOpenRouterProviderKey(providerName);
  const mappings =
    lens === "modelPublisher" ? MODEL_PUBLISHER_MAPPINGS : ENDPOINT_PROVIDER_MAPPINGS;
  const ambiguousReasons = AMBIGUOUS_PROVIDER_REASONS[lens];

  for (const candidate of providerCandidates(provider)) {
    const geography = mappings[candidate];
    if (geography) {
      return {
        status: "mapped",
        lens,
        providerName,
        providerSlug,
        normalizedName,
        matchedKey: candidate,
        geography,
      };
    }
  }

  for (const candidate of providerCandidates(provider)) {
    const reason = ambiguousReasons[candidate];
    if (reason) {
      return {
        status: "ambiguous",
        lens,
        providerName,
        providerSlug,
        normalizedName,
        reason,
      };
    }
  }

  return {
    status: "unknown",
    lens,
    providerName,
    providerSlug,
    normalizedName,
    reason: "No curated provider-country mapping is available.",
  };
}
