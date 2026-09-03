import fs from 'node:fs';
import path from 'node:path';
import type {
  Category,
  ChangeWithVersion,
  ConceptMap,
  Dataset,
  FeatureJourney,
  VersionFile,
} from './types';

const ROOT = process.cwd();

const REAL = {
  versions: path.join(ROOT, 'data/versions'),
  journeys: path.join(ROOT, 'data/feature-journeys'),
};
const SAMPLE = {
  versions: path.join(ROOT, 'data/sample/versions'),
  journeys: path.join(ROOT, 'data/sample/feature-journeys'),
};

function readJsonDir<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as T);
}

/** "1.9" phải đứng trước "1.10" — so sánh theo số, không theo chuỗi. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

let cached: Dataset | null = null;

/**
 * Đọc toàn bộ data lúc build. Ưu tiên output thật của pipeline
 * (data/versions/); chỉ rơi về data/sample/ khi thư mục đó còn trống, để một
 * repo mới clone vẫn render được mà không cần API key.
 */
export function getDataset(): Dataset {
  if (cached) return cached;

  const realVersions = readJsonDir<VersionFile>(REAL.versions);
  const isSample = realVersions.length === 0;
  const src = isSample ? SAMPLE : REAL;

  const versions = readJsonDir<VersionFile>(src.versions).sort((a, b) =>
    compareVersions(a.version, b.version)
  );
  const journeys = readJsonDir<FeatureJourney>(src.journeys).sort((a, b) =>
    a.title.localeCompare(b.title, 'vi')
  );
  const categories: Category[] = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data/taxonomy.json'), 'utf-8')
  ).categories;
  const concepts: ConceptMap = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data/concepts.json'), 'utf-8')
  );

  const changes: ChangeWithVersion[] = versions.flatMap((v) =>
    v.changes.map((c) => ({ ...c, version: v.version, release_date: v.release_date }))
  );

  cached = { isSample, categories, versions, journeys, concepts, changes };
  return cached;
}

export function getChangeById(id: string): ChangeWithVersion | undefined {
  return getDataset().changes.find((c) => c.id === id);
}

export function getJourneyById(id: string): FeatureJourney | undefined {
  return getDataset().journeys.find((j) => j.id === id);
}
