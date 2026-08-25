import type { Category, Change } from "@/lib/types";
import { CategoryBadge } from "./category-badge";

export function ChangeCard({
  change,
  category,
}: {
  change: Change;
  category: Category | undefined;
}) {
  return (
    <a
      href={change.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
    >
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={category} />
        {change.is_milestone && (
          <span className="rounded-full bg-yellow-400/20 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
            ★ Milestone
          </span>
        )}
        {change.breaking_change && (
          <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
            Breaking change
          </span>
        )}
      </div>
      <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{change.title}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{change.summary}</p>
      {change.why_it_matters && (
        <p className="mt-2 text-sm text-zinc-500 italic dark:text-zinc-500">
          {change.why_it_matters}
        </p>
      )}
    </a>
  );
}
