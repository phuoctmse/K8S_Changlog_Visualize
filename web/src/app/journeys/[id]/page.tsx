import Link from "next/link";
import { notFound } from "next/navigation";
import { loadFeatureJourneys, loadTaxonomy, loadVersions, parseVersion } from "@/lib/data";
import { CategoryBadge } from "@/components/category-badge";
import { StageBadge } from "@/components/stage-badge";

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [taxonomy, journeys, versions] = await Promise.all([
    loadTaxonomy(),
    loadFeatureJourneys(),
    loadVersions(),
  ]);

  const journey = journeys.find((j) => j.id === id);
  if (!journey) notFound();

  const changeById = new Map(
    versions.flatMap((v) => v.changes.map((c) => [c.id, c] as const))
  );

  const milestones = [...journey.milestones].sort(
    (a, b) => compareVersionAsc(a.version, b.version)
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/journeys" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ← Feature Journeys
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <CategoryBadge category={taxonomy.categories.find((c) => c.id === journey.category)} />
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{journey.title}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{journey.description}</p>

      <ol className="mt-10 space-y-8 border-l border-zinc-200 pl-6 dark:border-zinc-800">
        {milestones.map((m) => {
          const change = changeById.get(m.change_id);
          return (
            <li key={`${m.version}-${m.change_id}`} className="relative">
              <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-zinc-400 dark:border-zinc-950 dark:bg-zinc-600" />
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">v{m.version}</span>
                <StageBadge stage={m.stage} />
              </div>
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">{m.narrative}</p>
              {change && (
                <a
                  href={change.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {change.title} ↗
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function compareVersionAsc(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
