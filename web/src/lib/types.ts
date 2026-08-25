// Mirrors the schema documented in docs/proposal.md section 4. Keep this in
// sync with that file if the schema ever changes — proposal.md is the
// source of truth, this is just the TypeScript view of it.

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface Taxonomy {
  categories: Category[];
}

export interface Change {
  id: string;
  title: string;
  category: string;
  summary: string;
  why_it_matters: string;
  breaking_change: boolean;
  is_milestone: boolean;
  feature_journey_id: string | null;
  source_url: string;
  reviewed_by_human: boolean;
}

export interface VersionData {
  version: string;
  release_date: string | null;
  changes: Change[];
}

export type JourneyStage = 'alpha' | 'problem' | 'solution' | 'ga' | 'deprecated';

export interface Milestone {
  version: string;
  stage: JourneyStage;
  narrative: string;
  change_id: string;
}

export interface FeatureJourney {
  id: string;
  title: string;
  category: string;
  description: string;
  milestones: Milestone[];
}
