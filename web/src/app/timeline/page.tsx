import { loadTaxonomy, loadVersions } from "@/lib/data";
import { TimelineClient } from "@/components/timeline-client";

export default async function TimelinePage() {
  const [taxonomy, versions] = await Promise.all([loadTaxonomy(), loadVersions()]);

  return <TimelineClient categories={taxonomy.categories} versions={versions} />;
}
