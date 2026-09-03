import type { Category, CategoryId, JourneyStage } from './types';

export function categoryLabel(categories: Category[], id: CategoryId): string {
  return categories.find((c) => c.id === id)?.label ?? id;
}

/** "2019-09-18" -> "18/09/2019". Tự format để không phụ thuộc timezone lúc build. */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export const STAGE_META: Record<JourneyStage, { label: string; color: string }> = {
  problem: { label: 'Vấn đề', color: 'var(--danger)' },
  alpha: { label: 'Alpha', color: 'var(--cat-scheduling)' },
  solution: { label: 'Giải pháp', color: 'var(--cat-networking)' },
  ga: { label: 'GA', color: 'var(--cat-api-extensibility)' },
  deprecated: { label: 'Ngừng hỗ trợ', color: 'var(--muted)' },
};

/** Sắp xếp mốc trong journey theo version rồi theo thứ tự stage cho ổn định. */
export const STAGE_ORDER: JourneyStage[] = ['problem', 'alpha', 'solution', 'ga', 'deprecated'];
