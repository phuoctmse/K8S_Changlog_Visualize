import Link from 'next/link';
import type { Metadata } from 'next';
import { getDataset } from '@/lib/data';
import { categoryLabel } from '@/lib/format';
import JourneyTrack from '@/components/JourneyTrack';

export const metadata: Metadata = {
  title: 'Feature Journey',
  description:
    'Hành trình của từng tính năng Kubernetes qua nhiều version: vấn đề gì, giải pháp ra sao, kết thúc thế nào.',
};

export default function JourneysPage() {
  const { journeys, categories } = getDataset();

  return (
    <>
      <header className="pb-8 pt-4">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[34px]">
          Feature Journey
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
          Một thay đổi đơn lẻ hiếm khi kể đủ câu chuyện. Ở đây các thay đổi thuộc cùng một tính năng
          được nối lại theo trục version, để thấy vấn đề ban đầu là gì và Kubernetes đã đi tới đâu.
        </p>
      </header>

      {journeys.length === 0 ? (
        <div className="surface px-6 py-16 text-center">
          <p className="text-[15px] font-semibold">Chưa có hành trình nào</p>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Chạy <code className="font-mono">npm run journeys</code> sau khi đã có dữ liệu version.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {journeys.map((j) => (
            <Link
              key={j.id}
              href={`/journeys/${j.id}/`}
              data-cat={j.category}
              className="surface card-hover flex flex-col gap-3 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[17px] font-semibold leading-snug tracking-[-0.015em]">
                  {j.title}
                </h2>
                <span className="chip chip-cat flex-none">
                  <span className="dot" />
                  {categoryLabel(categories, j.category)}
                </span>
              </div>
              <p className="text-[14px] leading-relaxed text-[var(--muted)]">{j.description}</p>
              <div className="mt-auto pt-1">
                <JourneyTrack milestones={j.milestones} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
