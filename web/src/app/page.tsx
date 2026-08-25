import { loadTaxonomy, loadVersions } from "@/lib/data";
import { OverviewClient } from "@/components/overview-client";

export default async function OverviewPage() {
  const [taxonomy, versions] = await Promise.all([loadTaxonomy(), loadVersions()]);

  return <OverviewClient categories={taxonomy.categories} versions={versions} />;
}
