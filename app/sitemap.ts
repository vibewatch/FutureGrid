import type { MetadataRoute } from "next";
import { generateAllCareerInsights, getSectorAggregatesExtended } from "@/lib/data";
import { getLatestGeneratedAt } from "@/lib/provenance";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = getLatestGeneratedAt() ?? new Date().toISOString();

  const staticRoutes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "",           changeFrequency: "monthly", priority: 1.0 },
    { path: "/careers",  changeFrequency: "monthly", priority: 0.9 },
    { path: "/sectors",  changeFrequency: "monthly", priority: 0.9 },
    { path: "/skills",   changeFrequency: "monthly", priority: 0.8 },
    { path: "/global",   changeFrequency: "monthly", priority: 0.8 },
    { path: "/labor",    changeFrequency: "monthly", priority: 0.8 },
    { path: "/frontier", changeFrequency: "monthly", priority: 0.7 },
    { path: "/analysis", changeFrequency: "monthly", priority: 0.7 },
    { path: "/explore",  changeFrequency: "monthly", priority: 0.7 },
    { path: "/report",   changeFrequency: "monthly", priority: 0.6 },
    { path: "/sources",  changeFrequency: "yearly",  priority: 0.4 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const careerEntries: MetadataRoute.Sitemap = generateAllCareerInsights().map((career) => ({
    url: `${SITE_URL}/careers/${career.occupationCode}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const sectorEntries: MetadataRoute.Sitemap = getSectorAggregatesExtended().map((sector) => ({
    url: `${SITE_URL}/sectors/${encodeURIComponent(sector.sector)}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...careerEntries, ...sectorEntries];
}
