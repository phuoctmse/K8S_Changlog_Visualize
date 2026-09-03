import type { JourneyMilestone } from '@/lib/types';
import { STAGE_META } from '@/lib/format';

/** Dải mốc rút gọn: version + stage, dùng trên card danh sách journey. */
export default function JourneyTrack({ milestones }: { milestones: JourneyMilestone[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {milestones.map((m, i) => (
        <li key={`${m.version}-${m.change_id}`} className="flex items-center gap-1">
          <span
            className="chip"
            style={{
              color: STAGE_META[m.stage].color,
              background: `color-mix(in srgb, ${STAGE_META[m.stage].color} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${STAGE_META[m.stage].color} 28%, transparent)`,
            }}
          >
            <span className="font-mono">v{m.version}</span>
            <span className="opacity-70">{STAGE_META[m.stage].label}</span>
          </span>
          {i < milestones.length - 1 && (
            <svg viewBox="0 0 16 16" className="h-3 w-3 text-[var(--faint)]" fill="none" aria-hidden="true">
              <path d="M5 3.5 9.5 8 5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}
