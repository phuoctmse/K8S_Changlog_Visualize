import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getDataset } from '@/lib/data';
import TimelineView from '@/components/TimelineView';

export const metadata: Metadata = {
  title: 'Timeline',
  description: 'Mọi thay đổi của Kubernetes theo dòng thời gian, lọc được theo mảng và version.',
};

export default function TimelinePage() {
  const { categories, versions, changes, journeys } = getDataset();

  return (
    <>
      <header className="pb-2 pt-4">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[34px]">Timeline</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
          Đọc Kubernetes theo trục thời gian, từ version mới nhất trở về trước. Lọc theo mảng, theo
          version, hoặc chỉ giữ lại các mốc lớn và breaking change.
        </p>
      </header>

      {/* useSearchParams cần Suspense khi export tĩnh — deep link từ Overview map đi qua đây. */}
      <Suspense fallback={<div className="surface mt-8 h-40 animate-pulse" />}>
        <TimelineView
          categories={categories}
          versions={versions}
          changes={changes}
          journeys={journeys}
        />
      </Suspense>
    </>
  );
}
