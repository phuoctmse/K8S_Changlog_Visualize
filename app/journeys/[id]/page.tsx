import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getDataset, getChangeById, getJourneyById } from '@/lib/data';
import { STAGE_META, categoryLabel } from '@/lib/format';
import ChangeCard from '@/components/ChangeCard';

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getDataset().journeys.map((j) => ({ id: j.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const journey = getJourneyById(id);
  if (!journey) return { title: 'Không tìm thấy hành trình' };
  return { title: journey.title, description: journey.description };
}

export default async function JourneyDetailPage({ params }: Params) {
  const { id } = await params;
  const journey = getJourneyById(id);
  if (!journey) notFound();

  const { categories } = getDataset();
  const versionsSpan = journey.milestones.map((m) => m.version);

  return (
    <div data-cat={journey.category}>
      <nav className="pt-4 text-[13px]">
        <Link href="/journeys/" className="text-[var(--muted)] transition hover:text-[var(--text)]">
          ← Feature Journey
        </Link>
      </nav>

      <header className="border-b border-[var(--border)] pb-8 pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="chip chip-cat">
            <span className="dot" />
            {categoryLabel(categories, journey.category)}
          </span>
          <span className="chip chip-neutral font-mono">
            v{versionsSpan[0]} → v{versionsSpan[versionsSpan.length - 1]}
          </span>
          <span className="chip chip-neutral">{journey.milestones.length} mốc</span>
        </div>
        <h1 className="max-w-3xl text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[36px]">
          {journey.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] sm:text-[16px]">
          {journey.description}
        </p>
      </header>

      <ol className="relative mt-8 flex flex-col gap-8">
        <div
          className="absolute bottom-3 left-[15px] top-3 w-px bg-[var(--border)]"
          aria-hidden="true"
        />
        {journey.milestones.map((m, i) => {
          const stage = STAGE_META[m.stage];
          const change = getChangeById(m.change_id);
          return (
            <li key={`${m.version}-${m.change_id}-${i}`} className="relative">
              <div className="flex items-center gap-3.5">
                <span
                  className="relative z-10 grid h-8 w-8 flex-none place-items-center rounded-full border bg-[var(--surface)] font-mono text-[11px] font-semibold"
                  style={{
                    borderColor: `color-mix(in srgb, ${stage.color} 45%, var(--border))`,
                    color: stage.color,
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-semibold">v{m.version}</span>
                  <span
                    className="chip"
                    style={{
                      color: stage.color,
                      background: `color-mix(in srgb, ${stage.color} 12%, transparent)`,
                      borderColor: `color-mix(in srgb, ${stage.color} 28%, transparent)`,
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>

              <div className="ml-[15px] mt-3 flex flex-col gap-3 border-l border-[var(--border)] pl-6 sm:pl-8">
                <p className="text-[15px] leading-relaxed">{m.narrative}</p>
                {change ? (
                  <ChangeCard change={change} categories={categories} showVersion hideJourneyLink />
                ) : (
                  <p className="text-[13px] text-[var(--faint)]">
                    Không tìm thấy change gốc <code className="font-mono">{m.change_id}</code> trong
                    dữ liệu version.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
