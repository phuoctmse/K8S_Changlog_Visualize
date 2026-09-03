import Link from 'next/link';
import { getDataset } from '@/lib/data';
import { formatDate } from '@/lib/format';
import OverviewMap from '@/components/OverviewMap';
import StatTile from '@/components/StatTile';
import ChangeCard from '@/components/ChangeCard';

export default function HomePage() {
  const { categories, versions, changes, journeys, concepts } = getDataset();

  const first = versions[0];
  const last = versions[versions.length - 1];
  const breaking = changes.filter((c) => c.breaking_change).length;
  const milestones = changes.filter((c) => c.is_milestone);

  // Vài mốc lớn của các version mới nhất — đủ để trang chủ có "cửa sổ" vào nội dung.
  const highlights = [...milestones].reverse().slice(0, 4);
  const journeyTitle = new Map(journeys.map((j) => [j.id, j.title]));

  return (
    <>
      <section className="pt-6 sm:pt-10">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12px] font-medium text-[var(--muted)]">
          <span className="dot" style={{ background: 'var(--accent)' }} />
          {versions.length > 0 ? (
            <>
              Đang có dữ liệu v{first.version} → v{last.version}
            </>
          ) : (
            <>Chưa có dữ liệu version nào</>
          )}
        </p>

        <h1 className="max-w-3xl text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[46px]">
          Lịch sử Kubernetes,{' '}
          <span className="text-[var(--accent)]">đọc được trong một buổi chiều</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)] sm:text-[17px]">
          Changelog gốc của Kubernetes là hàng chục nghìn dòng bullet rời rạc. Trang này sắp lại
          chúng theo ba cách nhìn: bản đồ tổng quan để thấy mảng nào đang động, dòng thời gian để
          đọc theo từng version, và hành trình tính năng để hiểu vì sao một thứ trở thành như hôm
          nay.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href="/timeline/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Mở Timeline
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M5 12h13M13 6.5 18.5 12 13 17.5"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href="/journeys/"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)]"
          >
            Xem hành trình tính năng
          </Link>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile value={versions.length} label="Version" hint={versions.length ? `v${first.version} → v${last.version}` : undefined} />
        <StatTile value={changes.length} label="Thay đổi đã tổng hợp" />
        <StatTile value={milestones.length} label="Mốc lớn" accent="var(--milestone)" hint="GA / stable" />
        <StatTile value={breaking} label="Breaking change" accent="var(--danger)" hint="Cần chú ý khi nâng cấp" />
      </section>

      <OverviewMap
        categories={categories}
        versions={versions}
        changes={changes}
        concepts={concepts}
      />

      {highlights.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                Mốc lớn gần đây
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Những thay đổi được đánh dấu milestone ở các version mới nhất.
              </p>
            </div>
            <Link
              href="/timeline/?milestone=1"
              className="hidden whitespace-nowrap text-sm font-medium text-[var(--accent)] hover:underline sm:block"
            >
              Xem tất cả →
            </Link>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {highlights.map((c) => (
              <ChangeCard
                key={`${c.version}-${c.id}`}
                change={c}
                categories={categories}
                showVersion
                journeyTitle={
                  c.feature_journey_id ? journeyTitle.get(c.feature_journey_id) : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {versions.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
            Nhảy thẳng tới một version
          </h2>
          <div className="flex flex-wrap gap-2">
            {[...versions].reverse().map((v) => (
              <Link
                key={v.version}
                href={`/timeline/?v=${v.version}`}
                className="chip chip-neutral chip-button font-mono"
                title={
                  formatDate(v.release_date)
                    ? `Phát hành ${formatDate(v.release_date)} · ${v.changes.length} thay đổi`
                    : `${v.changes.length} thay đổi`
                }
              >
                v{v.version}
                <span className="text-[var(--faint)]">{v.changes.length}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
