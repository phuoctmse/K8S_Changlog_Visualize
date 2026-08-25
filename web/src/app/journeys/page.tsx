import Link from "next/link";
import { loadFeatureJourneys, loadTaxonomy } from "@/lib/data";
import { CategoryBadge } from "@/components/category-badge";
import { EmptyState } from "@/components/empty-state";

export default async function JourneysPage() {
  const [taxonomy, journeys] = await Promise.all([loadTaxonomy(), loadFeatureJourneys()]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Feature Journeys</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Các mạch tiến hoá tính năng xuyên nhiều version Kubernetes.
      </p>

      {journeys.length === 0 ? (
        <EmptyState
          title="Chưa có feature journey nào."
          hint="Chạy `node scripts/group-feature-journeys.mjs` sau khi đã có data/versions/*.json."
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {journeys.map((journey) => (
            <Link
              key={journey.id}
              href={`/journeys/${journey.id}`}
              className="block rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              <CategoryBadge
                category={taxonomy.categories.find((c) => c.id === journey.category)}
              />
              <h2 className="mt-2 font-semibold">{journey.title}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {journey.description}
              </p>
              <p className="mt-3 text-xs text-zinc-400">
                {journey.milestones.length} milestone
                {journey.milestones.length > 1 ? "s" : ""} · v
                {journey.milestones[0]?.version} → v
                {journey.milestones[journey.milestones.length - 1]?.version}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
