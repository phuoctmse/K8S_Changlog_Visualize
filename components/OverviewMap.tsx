'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Category, ChangeWithVersion, ConceptMap, VersionFile } from '@/lib/types';

interface Props {
  categories: Category[];
  versions: VersionFile[];
  changes: ChangeWithVersion[];
  concepts: ConceptMap;
}

type Mode = 'changes' | 'concept';

export default function OverviewMap({ categories, versions, changes, concepts }: Props) {
  const [mode, setMode] = useState<Mode>('changes');

  // Ma trận category × version + số thay đổi của từng ô, tính một lần.
  const { counts, max, rowTotals, colTotals } = useMemo(() => {
    const counts = new Map<string, number>();
    const rowTotals = new Map<string, number>();
    const colTotals = new Map<string, number>();
    let max = 0;
    for (const c of changes) {
      const key = `${c.category}|${c.version}`;
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      if (n > max) max = n;
      rowTotals.set(c.category, (rowTotals.get(c.category) ?? 0) + 1);
      colTotals.set(c.version, (colTotals.get(c.version) ?? 0) + 1);
    }
    return { counts, max, rowTotals, colTotals };
  }, [changes]);

  const changesByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of changes) m.set(c.category, (m.get(c.category) ?? 0) + 1);
    return m;
  }, [changes]);

  return (
    <section className="mt-12">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Bản đồ tổng quan</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {mode === 'changes'
              ? 'Mỗi ô là số thay đổi của một mảng trong một version — ô càng đậm, version đó càng động ở mảng đó.'
              : 'Các khái niệm cốt lõi của Kubernetes, xếp theo tầng. Bấm vào một khái niệm để xem những thay đổi thuộc mảng đó.'}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === 'changes' ? (
        <ChangesGrid
          categories={categories}
          versions={versions}
          counts={counts}
          max={max}
          rowTotals={rowTotals}
          colTotals={colTotals}
        />
      ) : (
        <ConceptGrid concepts={concepts} changesByCategory={changesByCategory} />
      )}
    </section>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const options: { id: Mode; label: string }[] = [
    { id: 'changes', label: 'Changes' },
    { id: 'concept', label: 'Concept' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Chế độ hiển thị bản đồ"
      className="inline-flex self-start rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          type="button"
          aria-selected={mode === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-xl px-4 py-1.5 text-[13px] font-medium transition ${
            mode === o.id
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChangesGrid({
  categories,
  versions,
  counts,
  max,
  rowTotals,
  colTotals,
}: {
  categories: Category[];
  versions: VersionFile[];
  counts: Map<string, number>;
  max: number;
  rowTotals: Map<string, number>;
  colTotals: Map<string, number>;
}) {
  // Cột label category cố định; phần version cuộn ngang khi có nhiều bản.
  const template = `minmax(0,1fr)`;

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[620px] p-4 sm:p-5">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `168px repeat(${versions.length}, ${template})`,
            }}
          >
            {/* hàng tiêu đề: version */}
            <div />
            {versions.map((v) => (
              <div
                key={v.version}
                className="pb-1 text-center font-mono text-[11px] text-[var(--faint)]"
                title={`${colTotals.get(v.version) ?? 0} thay đổi trong v${v.version}`}
              >
                {v.version}
              </div>
            ))}

            {/* mỗi hàng: 1 category */}
            {categories.map((cat) => (
              <div key={cat.id} className="contents" data-cat={cat.id}>
                <div className="flex items-center gap-2 pr-3 text-[13px]">
                  <span className="dot" />
                  <span className="truncate font-medium">{cat.label}</span>
                  <span className="ml-auto font-mono text-[11px] text-[var(--faint)]">
                    {rowTotals.get(cat.id) ?? 0}
                  </span>
                </div>
                {versions.map((v) => {
                  const n = counts.get(`${cat.id}|${v.version}`) ?? 0;
                  const level = max > 0 ? n / max : 0;
                  const label = `${cat.label} · v${v.version}: ${n} thay đổi`;
                  if (n === 0) {
                    return (
                      <div
                        key={v.version}
                        className="heat-cell h-9 rounded-lg opacity-45"
                        style={{ ['--level' as string]: '0' }}
                        title={label}
                        aria-label={label}
                      />
                    );
                  }
                  return (
                    <Link
                      key={v.version}
                      href={`/timeline/?cat=${cat.id}&v=${v.version}`}
                      className="heat-cell grid h-9 place-items-center rounded-lg font-mono text-[11px] font-semibold"
                      style={{
                        ['--level' as string]: String(0.25 + 0.75 * level),
                        color: level > 0.55 ? '#fff' : 'var(--text)',
                      }}
                      title={label}
                      aria-label={label}
                    >
                      {n}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border)] px-4 py-3 text-[12px] text-[var(--faint)] sm:px-5">
        <span>Ít thay đổi</span>
        <div className="flex gap-1" aria-hidden="true" data-cat="networking">
          {[0, 0.25, 0.5, 0.75, 1].map((l) => (
            <span
              key={l}
              className="heat-cell h-4 w-6 rounded"
              style={{ ['--level' as string]: String(l) }}
            />
          ))}
        </div>
        <span>Nhiều thay đổi</span>
        <span className="ml-auto hidden sm:inline">
          Bấm vào ô bất kỳ để lọc Timeline theo đúng mảng và version đó.
        </span>
        <span className="ml-auto sm:hidden">
          Vuốt ngang để xem hết các version; chạm vào ô để lọc Timeline.
        </span>
      </div>
    </div>
  );
}

function ConceptGrid({
  concepts,
  changesByCategory,
}: {
  concepts: ConceptMap;
  changesByCategory: Map<string, number>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {concepts.layers.map((layer) => (
        <div key={layer.id} className="surface p-4 sm:p-5">
          <div className="mb-3.5 flex flex-col gap-1 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-baseline sm:gap-3">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{layer.label}</h3>
            <p className="text-[13px] text-[var(--muted)]">{layer.description}</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {layer.concepts.map((c) => {
              const n = changesByCategory.get(c.category) ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/timeline/?cat=${c.category}`}
                  data-cat={c.category}
                  className="card-hover group rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="dot" />
                    <span className="text-[14px] font-semibold tracking-[-0.01em]">{c.label}</span>
                    <span className="ml-auto font-mono text-[11px] text-[var(--faint)] transition group-hover:text-[var(--cat)]">
                      {n}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
                    {c.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <p className="px-1 text-[12px] text-[var(--faint)]">
        Số bên phải mỗi khái niệm là số thay đổi thuộc cùng mảng (category) với khái niệm đó, không
        phải số thay đổi chạm trực tiếp vào nó.
      </p>
    </div>
  );
}
