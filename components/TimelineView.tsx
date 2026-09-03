'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Category, ChangeWithVersion, FeatureJourney, VersionFile } from '@/lib/types';
import { formatDate } from '@/lib/format';
import ChangeCard from './ChangeCard';

interface Props {
  categories: Category[];
  versions: VersionFile[];
  changes: ChangeWithVersion[];
  journeys: FeatureJourney[];
}

export default function TimelineView({ categories, versions, changes, journeys }: Props) {
  const params = useSearchParams();

  const [query, setQuery] = useState('');
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [version, setVersion] = useState<string | null>(null);
  const [onlyMilestone, setOnlyMilestone] = useState(false);
  const [onlyBreaking, setOnlyBreaking] = useState(false);

  // Bản đồ tổng quan link sang đây kèm ?cat= / ?v= / ?milestone= — nhận state ban đầu từ đó.
  useEffect(() => {
    const cat = params.get('cat');
    const v = params.get('v');
    setActiveCats(cat ? [cat] : []);
    setVersion(v);
    setOnlyMilestone(params.get('milestone') === '1');
    setOnlyBreaking(params.get('breaking') === '1');
  }, [params]);

  const journeyTitle = useMemo(
    () => new Map(journeys.map((j) => [j.id, j.title])),
    [journeys]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return changes.filter((c) => {
      if (activeCats.length && !activeCats.includes(c.category)) return false;
      if (version && c.version !== version) return false;
      if (onlyMilestone && !c.is_milestone) return false;
      if (onlyBreaking && !c.breaking_change) return false;
      if (q) {
        const hay = `${c.title} ${c.summary} ${c.why_it_matters}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [changes, query, activeCats, version, onlyMilestone, onlyBreaking]);

  // Nhóm theo version, mới nhất lên trước — thứ tự version đã sort sẵn ở lib/data.
  const grouped = useMemo(() => {
    const byVersion = new Map<string, ChangeWithVersion[]>();
    for (const c of filtered) {
      if (!byVersion.has(c.version)) byVersion.set(c.version, []);
      byVersion.get(c.version)!.push(c);
    }
    return [...versions]
      .reverse()
      .map((v) => ({
        version: v.version,
        release_date: v.release_date,
        items: byVersion.get(v.version) ?? [],
      }))
      .filter((g) => g.items.length > 0);
  }, [filtered, versions]);

  const hasFilter =
    query.trim() !== '' ||
    activeCats.length > 0 ||
    version !== null ||
    onlyMilestone ||
    onlyBreaking;

  function toggleCat(id: string) {
    setActiveCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function reset() {
    setQuery('');
    setActiveCats([]);
    setVersion(null);
    setOnlyMilestone(false);
    setOnlyBreaking(false);
  }

  return (
    <>
      <div className="surface z-30 mb-8 p-4 sm:sticky sm:top-16 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Tìm trong nội dung thay đổi</span>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.4" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, tóm tắt, lý do quan trọng…"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={version ?? ''}
              onChange={(e) => setVersion(e.target.value || null)}
              aria-label="Lọc theo version"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 font-mono text-[13px] outline-none transition focus:border-[var(--accent)]"
            >
              <option value="">Mọi version</option>
              {[...versions].reverse().map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version}
                </option>
              ))}
            </select>

            <button
              type="button"
              aria-pressed={onlyMilestone}
              onClick={() => setOnlyMilestone((v) => !v)}
              className="chip chip-neutral chip-button"
              style={{ ['--cat' as string]: 'var(--milestone)' }}
            >
              Mốc lớn
            </button>
            <button
              type="button"
              aria-pressed={onlyBreaking}
              onClick={() => setOnlyBreaking((v) => !v)}
              className="chip chip-neutral chip-button"
              style={{ ['--cat' as string]: 'var(--danger)' }}
            >
              Breaking
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              data-cat={cat.id}
              aria-pressed={activeCats.includes(cat.id)}
              onClick={() => toggleCat(cat.id)}
              className="chip chip-neutral chip-button"
            >
              <span className="dot" />
              {cat.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3 text-[13px] text-[var(--muted)]">
          <span>
            <strong className="font-semibold text-[var(--text)]">{filtered.length}</strong> thay đổi
            {grouped.length > 0 && <> trong {grouped.length} version</>}
          </span>
          {hasFilter && (
            <button
              type="button"
              onClick={reset}
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="surface px-6 py-16 text-center">
          <p className="text-[15px] font-semibold">Không có thay đổi nào khớp bộ lọc</p>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Thử bỏ bớt một vài điều kiện, hoặc tìm bằng từ khoá ngắn hơn.
          </p>
          {hasFilter && (
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium transition hover:border-[var(--border-strong)]"
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* trục dọc của timeline */}
          <div
            className="absolute bottom-2 left-[15px] top-2 w-px bg-[var(--border)] sm:left-[19px]"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-10">
            {grouped.map((g) => (
              <section key={g.version} id={`v${g.version}`} className="scroll-mt-40">
                <div className="mb-4 flex items-center gap-3.5">
                  <span className="relative z-10 grid h-8 w-8 flex-none place-items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] sm:h-10 sm:w-10">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-mono text-lg font-semibold tracking-[-0.02em] sm:text-xl">
                      v{g.version}
                    </h2>
                    <p className="text-[12.5px] text-[var(--faint)]">
                      {formatDate(g.release_date) ? `Phát hành ${formatDate(g.release_date)} · ` : ''}
                      {g.items.length} thay đổi
                    </p>
                  </div>
                </div>
                <div className="ml-[15px] flex flex-col gap-3 border-l border-[var(--border)] pl-6 sm:ml-[19px] sm:pl-8">
                  {g.items.map((c) => (
                    <ChangeCard
                      key={`${c.version}-${c.id}`}
                      change={c}
                      categories={categories}
                      journeyTitle={
                        c.feature_journey_id ? journeyTitle.get(c.feature_journey_id) : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
