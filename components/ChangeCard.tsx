import Link from 'next/link';
import type { Category, ChangeWithVersion } from '@/lib/types';
import { categoryLabel } from '@/lib/format';
import { BreakingBadge, MilestoneBadge, VersionBadge } from './Badges';

interface Props {
  change: ChangeWithVersion;
  categories: Category[];
  showVersion?: boolean;
  journeyTitle?: string;
  /** Bật khi card nằm ngay trong trang của chính journey đó — link quay lại chính nó là thừa. */
  hideJourneyLink?: boolean;
}

export default function ChangeCard({
  change,
  categories,
  showVersion,
  journeyTitle,
  hideJourneyLink,
}: Props) {
  const showJourney = !hideJourneyLink && change.feature_journey_id;
  return (
    <article data-cat={change.category} className="surface card-hover overflow-hidden">
      <div className="flex">
        <div className="accent-bar w-[3px] flex-none" aria-hidden="true" />
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <span className="chip chip-cat">
              <span className="dot" />
              {categoryLabel(categories, change.category)}
            </span>
            {showVersion && <VersionBadge version={change.version} />}
            {change.is_milestone && <MilestoneBadge />}
            {change.breaking_change && <BreakingBadge />}
          </div>

          <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] sm:text-base">
            {change.title}
          </h3>

          <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{change.summary}</p>

          {change.why_it_matters && (
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--faint)]">
                Vì sao quan trọng
              </p>
              <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
                {change.why_it_matters}
              </p>
            </div>
          )}

          {(showJourney || change.source_url) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
              {showJourney && (
                <Link
                  href={`/journeys/${change.feature_journey_id}/`}
                  className="inline-flex items-center gap-1.5 font-medium text-[var(--cat)] hover:underline"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path
                      d="M4 17.5h3.2c3 0 3-11 6-11H20M20 6.5l-2.6-2.6M20 6.5l-2.6 2.6"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {journeyTitle ?? 'Xem hành trình tính năng'}
                </Link>
              )}
              {change.source_url && (
                <a
                  href={change.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[var(--faint)] transition hover:text-[var(--text)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path
                      d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.3-1.3M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.3 1.3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  Nguồn
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
