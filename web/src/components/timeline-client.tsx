"use client";

import { useMemo, useState } from "react";
import type { Category, VersionData } from "@/lib/types";
import { colorClasses } from "@/lib/colors";
import { ChangeCard } from "./change-card";
import { EmptyState } from "./empty-state";

export function TimelineClient({
  categories,
  versions,
}: {
  categories: Category[];
  versions: VersionData[];
}) {
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (id: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredVersions = useMemo(() => {
    if (activeCategories.size === 0) return versions;
    return versions
      .map((v) => ({
        ...v,
        changes: v.changes.filter((c) => activeCategories.has(c.category)),
      }))
      .filter((v) => v.changes.length > 0);
  }, [versions, activeCategories]);

  if (versions.length === 0) {
    return (
      <EmptyState
        title="Chưa có dữ liệu."
        hint="Chạy pipeline (xem README.md ở repo root) để tạo data/versions/*.json trước."
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Timeline mode</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Duyệt thay đổi theo từng version, filter theo category.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const c = colorClasses(cat.color);
          const active = activeCategories.has(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? `${c.bgSoft} ${c.border} ${c.text}`
                  : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${c.bg}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      <ol className="mt-10 space-y-10 border-l border-zinc-200 pl-6 dark:border-zinc-800">
        {filteredVersions.length === 0 ? (
          <EmptyState title="Không có change nào khớp filter đã chọn." />
        ) : (
          filteredVersions.map((v) => (
            <li key={v.version} className="relative">
              <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-zinc-400 dark:border-zinc-950 dark:bg-zinc-600" />
              <h2 className="text-lg font-semibold">
                v{v.version}
                {v.release_date && (
                  <span className="ml-2 text-sm font-normal text-zinc-400">
                    {v.release_date}
                  </span>
                )}
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {v.changes.map((change) => (
                  <ChangeCard
                    key={change.id}
                    change={change}
                    category={categories.find((c) => c.id === change.category)}
                  />
                ))}
              </div>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
