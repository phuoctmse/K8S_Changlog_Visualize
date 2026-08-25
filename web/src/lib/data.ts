import fs from 'node:fs/promises';
import path from 'node:path';
import type { Category, FeatureJourney, Taxonomy, VersionData } from './types';

// The pipeline (scripts/*.mjs) writes to <repo-root>/data. This app lives in
// <repo-root>/web, so data is one level up from the Next.js process cwd.
const DATA_DIR = path.join(process.cwd(), '..', 'data');

async function readJsonDir<T>(dirName: string): Promise<T[]> {
  const dir = path.join(DATA_DIR, dirName);
  let files: string[];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
  } catch {
    return []; // directory doesn't exist yet — pipeline hasn't run
  }
  const results = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(dir, f), 'utf-8')) as T)
  );
  return results;
}

export function parseVersion(version: string): number[] {
  return version.split('.').map((p) => Number.parseInt(p, 10) || 0);
}

export function compareVersionsDesc(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function loadTaxonomy(): Promise<Taxonomy> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, 'taxonomy.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { categories: [] };
  }
}

export async function loadVersions(): Promise<VersionData[]> {
  const versions = await readJsonDir<VersionData>('versions');
  return versions.sort((a, b) => compareVersionsDesc(a.version, b.version));
}

export async function loadFeatureJourneys(): Promise<FeatureJourney[]> {
  const journeys = await readJsonDir<FeatureJourney>('feature-journeys');
  return journeys.sort((a, b) => a.title.localeCompare(b.title));
}

export function categoryById(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
