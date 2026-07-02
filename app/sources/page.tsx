import SourcesView from "@/components/sources/SourcesView";
import { getDataSources } from "@/lib/data";
import { getAIFrontierData } from "@/lib/ai-frontier";
import type { DataSource } from "@/lib/data";

export default function SourcesPage() {
  const { generatedAt, sources, note } = getDataSources();

  const snapshotDate = (() => {
    try {
      const d = new Date(generatedAt);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return null;
    }
  })();

  const frontierData = getAIFrontierData();
  const { source: fs } = frontierData;
  const frontierYear = (() => {
    try {
      const y = new Date(fs.accessed).getFullYear();
      return isNaN(y) ? new Date().getFullYear() : y;
    } catch {
      return new Date().getFullYear();
    }
  })();
  const epochSource: DataSource = {
    name: fs.name,
    publisher: fs.publisher,
    year: frontierYear,
    url: fs.url,
    license: fs.license,
    usedFor: "AI training-compute/cost/power frontier trends (AI Frontier page)",
  };

  const allSources = sources.concat([epochSource]);

  return (
    <SourcesView
      generatedAt={generatedAt}
      snapshotDate={snapshotDate}
      sources={allSources}
      note={note ?? null}
    />
  );
}
