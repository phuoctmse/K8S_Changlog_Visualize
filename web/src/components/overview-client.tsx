"use client";

import { useMemo, useState } from "react";
import type { Category, VersionData } from "@/lib/types";
import { ChangeCard } from "./change-card";
import { colorClasses } from "@/lib/colors";
import { EmptyState } from "./empty-state";

type Mode = "changes" | "concept";

export function OverviewClient({
  categories,
  versions,
}: {
  categories: Category[];
  versions: VersionData[];
}) {
  const [mode, setMode] = useState<Mode>("changes");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allChanges = useMemo(
    () =>
      versions.flatMap((v) => v.changes.map((c) => ({ ...c, version: v.version }))),
    [versions]
  );

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of allChanges) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
    return counts;
  }, [allChanges]);

  const visibleChanges = selectedCategory
    ? allChanges.filter((c) => c.category === selectedCategory)
    : allChanges;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview map</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Toàn bộ thay đổi Kubernetes, gom theo category.
          </p>
        </div>
        <div className="flex rounded-full border border-zinc-200 p-1 dark:border-zinc-800">
          {(["changes", "concept"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {m === "changes" ? "Changes" : "Concept"}
            </button>
          ))}
        </div>
      </div>

      {mode === "concept" ? (
        <EmptyState
          title="Concept view chưa được xây dựng."
          hint="Cần grounded content từ K8s official docs — xem mục 6 trong docs/proposal.md. Chưa có quyết định thiết kế nào được chốt cho view này."
        />
      ) : allChanges.length === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu."
          hint="Chạy pipeline (xem README.md ở repo root) để tạo data/versions/*.json trước."
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              Tất cả
              <span className="text-xs opacity-70">{allChanges.length}</span>
            </button>
            {categories.map((cat) => {
              const c = colorClasses(cat.color);
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    active
                      ? `${c.bgSoft} ${c.border} ${c.text}`
                      : "border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${c.bg}`} />
                    {cat.label}
                  </span>
                  <span className="text-xs opacity-70">{countByCategory.get(cat.id) ?? 0}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleChanges.map((change) => (
              <div key={`${change.version}-${change.id}`}>
                <p className="mb-1 text-xs font-medium text-zinc-400">v{change.version}</p>
                <ChangeCard
                  change={change}
                  category={categories.find((c) => c.id === change.category)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
