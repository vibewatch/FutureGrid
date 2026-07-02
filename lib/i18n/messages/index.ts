import { commonEn } from "./en/common";
import { navEn } from "./en/nav";
import { dashboardEn } from "./en/dashboard";
import { careersEn } from "./en/careers";
import { sectorsEn } from "./en/sectors";
import { skillsEn } from "./en/skills";
import { globalEn } from "./en/global";
import { checkerEn } from "./en/checker";
import { commandEn } from "./en/command";
import { sourcesEn } from "./en/sources";
import { heatmapEn } from "./en/heatmap";
import { exploreEn } from "./en/explore";
import { reportEn } from "./en/report";
import { analysisEn } from "./en/analysis";
import { keyfindingsEn } from "./en/keyfindings";
import { dataexportEn } from "./en/dataexport";
import { chartsEn } from "./en/charts";
import { pulseEn } from "./en/pulse";
import { layoffsEn } from "./en/layoffs";
import { laborEn } from "./en/labor";
import { frontierEn } from "./en/frontier";
import { commonZh } from "./zh/common";
import { navZh } from "./zh/nav";
import { dashboardZh } from "./zh/dashboard";
import { careersZh } from "./zh/careers";
import { sectorsZh } from "./zh/sectors";
import { skillsZh } from "./zh/skills";
import { globalZh } from "./zh/global";
import { checkerZh } from "./zh/checker";
import { commandZh } from "./zh/command";
import { sourcesZh } from "./zh/sources";
import { heatmapZh } from "./zh/heatmap";
import { exploreZh } from "./zh/explore";
import { reportZh } from "./zh/report";
import { analysisZh } from "./zh/analysis";
import { keyfindingsZh } from "./zh/keyfindings";
import { dataexportZh } from "./zh/dataexport";
import { chartsZh } from "./zh/charts";
import { pulseZh } from "./zh/pulse";
import { layoffsZh } from "./zh/layoffs";
import { laborZh } from "./zh/labor";
import { frontierZh } from "./zh/frontier";

export const messages = {
  en: { common: commonEn, nav: navEn, dashboard: dashboardEn, careers: careersEn, sectors: sectorsEn, skills: skillsEn, global: globalEn, checker: checkerEn, command: commandEn, sources: sourcesEn, heatmap: heatmapEn, explore: exploreEn, report: reportEn, analysis: analysisEn, keyfindings: keyfindingsEn, dataexport: dataexportEn, charts: chartsEn, pulse: pulseEn, layoffs: layoffsEn, labor: laborEn, frontier: frontierEn },
  zh: { common: commonZh, nav: navZh, dashboard: dashboardZh, careers: careersZh, sectors: sectorsZh, skills: skillsZh, global: globalZh, checker: checkerZh, command: commandZh, sources: sourcesZh, heatmap: heatmapZh, explore: exploreZh, report: reportZh, analysis: analysisZh, keyfindings: keyfindingsZh, dataexport: dataexportZh, charts: chartsZh, pulse: pulseZh, layoffs: layoffsZh, labor: laborZh, frontier: frontierZh },
} as const;

export type Messages = typeof messages;
