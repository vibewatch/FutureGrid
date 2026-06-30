import { commonEn } from "./en/common";
import { navEn } from "./en/nav";
import { dashboardEn } from "./en/dashboard";
import { careersEn } from "./en/careers";
import { sectorsEn } from "./en/sectors";
import { skillsEn } from "./en/skills";
import { globalEn } from "./en/global";
import { sourcesEn } from "./en/sources";
import { heatmapEn } from "./en/heatmap";
import { exploreEn } from "./en/explore";
import { reportEn } from "./en/report";
import { keyfindingsEn } from "./en/keyfindings";
import { dataexportEn } from "./en/dataexport";
import { chartsEn } from "./en/charts";
import { commonZh } from "./zh/common";
import { navZh } from "./zh/nav";
import { dashboardZh } from "./zh/dashboard";
import { careersZh } from "./zh/careers";
import { sectorsZh } from "./zh/sectors";
import { skillsZh } from "./zh/skills";
import { globalZh } from "./zh/global";
import { sourcesZh } from "./zh/sources";
import { heatmapZh } from "./zh/heatmap";
import { exploreZh } from "./zh/explore";
import { reportZh } from "./zh/report";
import { keyfindingsZh } from "./zh/keyfindings";
import { dataexportZh } from "./zh/dataexport";
import { chartsZh } from "./zh/charts";

export const messages = {
  en: { common: commonEn, nav: navEn, dashboard: dashboardEn, careers: careersEn, sectors: sectorsEn, skills: skillsEn, global: globalEn, sources: sourcesEn, heatmap: heatmapEn, explore: exploreEn, report: reportEn, keyfindings: keyfindingsEn, dataexport: dataexportEn, charts: chartsEn },
  zh: { common: commonZh, nav: navZh, dashboard: dashboardZh, careers: careersZh, sectors: sectorsZh, skills: skillsZh, global: globalZh, sources: sourcesZh, heatmap: heatmapZh, explore: exploreZh, report: reportZh, keyfindings: keyfindingsZh, dataexport: dataexportZh, charts: chartsZh },
} as const;

export type Messages = typeof messages;
