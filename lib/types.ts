// Các type này phản chiếu đúng schema mà pipeline sinh ra
// (scripts/summarize-changelog.mjs và scripts/group-feature-journeys.mjs).
// Đổi schema thì sửa CLAUDE.md / proposal trước, rồi mới sửa ở đây.

export type CategoryId =
  | 'networking'
  | 'security'
  | 'storage'
  | 'scheduling'
  | 'container-runtime'
  | 'observability'
  | 'api-extensibility';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
}

export interface Change {
  id: string;
  title: string;
  category: CategoryId;
  summary: string;
  why_it_matters: string;
  breaking_change: boolean;
  is_milestone: boolean;
  feature_journey_id: string | null;
  source_url: string | null;
  reviewed_by_human: boolean;
}

export interface VersionFile {
  version: string;
  release_date: string | null;
  changes: Change[];
}

export type JourneyStage = 'alpha' | 'problem' | 'solution' | 'ga' | 'deprecated';

export interface JourneyMilestone {
  version: string;
  stage: JourneyStage;
  narrative: string;
  change_id: string;
}

export interface FeatureJourney {
  id: string;
  title: string;
  category: CategoryId;
  description: string;
  milestones: JourneyMilestone[];
}

export interface Concept {
  id: string;
  label: string;
  category: CategoryId;
  description: string;
}

export interface ConceptLayer {
  id: string;
  label: string;
  description: string;
  concepts: Concept[];
}

export interface ConceptMap {
  reviewed_by_human: boolean;
  note: string;
  layers: ConceptLayer[];
}

/** Một change kèm version chứa nó — dạng đã làm phẳng, tiện cho search/filter. */
export interface ChangeWithVersion extends Change {
  version: string;
  release_date: string | null;
}

export interface Dataset {
  /** true khi đang chạy trên data/sample/ vì pipeline chưa sinh data thật. */
  isSample: boolean;
  categories: Category[];
  versions: VersionFile[];
  journeys: FeatureJourney[];
  concepts: ConceptMap;
  changes: ChangeWithVersion[];
}
