#!/usr/bin/env node
/**
 * Orchestrator — runs the full pipeline sequentially for every K8s minor
 * version from v1.0 to the latest (currently v1.36, April 2026), then
 * runs the cross-version Feature Journey grouping once at the end.
 *
 * Per version: fetch -> parse -> summarize (LLM API)
 * Once, after all versions: group-feature-journeys (LLM API)
 *
 * Design choices:
 * - Sequential, not parallel: keeps LLM API usage predictable and
 *   avoids rate-limit storms across 33+ versions.
 * - Resumable: skips a version's step if its output file already exists,
 *   so a failed run (rate limit, network blip) can just be re-invoked.
 * - Logs a running cost/progress summary so a rate-limit or budget issue
 *   surfaces immediately instead of silently burning through the batch.
 *
 * Usage:
 *   OLLAMA_API_KEY=... node run-backfill.mjs
 *   OLLAMA_API_KEY=... node run-backfill.mjs --from 1.20 --to 1.25   (partial range)
 *   OLLAMA_API_KEY=... node run-backfill.mjs --skip-journeys         (versions only)
 *   (or ANTHROPIC_API_KEY=... as fallback provider — see scripts/llm-client.mjs)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchChangelog } from './fetch-changelog.mjs';
import { parseChangelog } from './parse-changelog.mjs';
import { summarizeChangelog } from './summarize-changelog.mjs';
import { groupFeatureJourneys } from './group-feature-journeys.mjs';

// Kubernetes minor versions from v1.0 (2015) to v1.36 (April 2026).
// CHANGELOG-1.0.md through CHANGELOG-1.2.md don't exist as separate files
// in the modern repo layout (pre-dates the current changelog convention) —
// the script skips any version whose fetch 404s rather than hard-failing,
// see `fetchOne` below.
const ALL_VERSIONS = Array.from({ length: 37 }, (_, i) => `1.${i}`); // 1.0 .. 1.36

const RAW_DIR = path.resolve('data/raw');
const PARSED_DIR = path.resolve('data/parsed');
const VERSIONS_DIR = path.resolve('data/versions');

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from');
  const toIdx = args.indexOf('--to');
  const from = fromIdx >= 0 ? args[fromIdx + 1] : null;
  const to = toIdx >= 0 ? args[toIdx + 1] : null;
  const skipJourneys = args.includes('--skip-journeys');
  return { from, to, skipJourneys };
}

function sliceVersions(from, to) {
  let versions = ALL_VERSIONS;
  if (from) versions = versions.slice(versions.indexOf(from));
  if (to) versions = versions.slice(0, versions.indexOf(to) + 1);
  return versions;
}

async function processVersion(version, stats) {
  console.log(`\n=== v${version} ===`);

  // 1. fetch (skip if raw already saved)
  const rawPath = path.join(RAW_DIR, `${version}.md`);
  if (await fileExists(rawPath)) {
    console.log(`  [skip] fetch (already have ${rawPath})`);
  } else {
    try {
      await fetchChangelog(version);
    } catch (err) {
      // Older versions (< 1.3 roughly) may not have a CHANGELOG-x.y.md at
      // this path — treat a fetch failure as "not applicable", not fatal.
      console.warn(`  [warn] fetch failed, skipping version entirely: ${err.message}`);
      stats.skipped.push(version);
      return;
    }
  }

  // 2. parse (skip if parsed already exists)
  const parsedPath = path.join(PARSED_DIR, `${version}.json`);
  if (await fileExists(parsedPath)) {
    console.log(`  [skip] parse (already have ${parsedPath})`);
  } else {
    try {
      await parseChangelog(version);
    } catch (err) {
      console.warn(`  [warn] parse failed: ${err.message}`);
      stats.failed.push({ version, stage: 'parse', error: err.message });
      return;
    }
  }

  // 3. summarize (skip if final version file already exists — this is the
  // expensive LLM API stage, so resumability matters most here)
  const versionOutPath = path.join(VERSIONS_DIR, `${version}.json`);
  if (await fileExists(versionOutPath)) {
    console.log(`  [skip] summarize (already have ${versionOutPath})`);
    stats.done.push(version);
    return;
  }
  try {
    const result = await summarizeChangelog(version);
    stats.done.push(version);
    stats.totalChanges += result.changes.length;
  } catch (err) {
    console.warn(`  [warn] summarize failed: ${err.message}`);
    stats.failed.push({ version, stage: 'summarize', error: err.message });
  }
}

async function main() {
  const { from, to, skipJourneys } = parseArgs();
  const versions = sliceVersions(from, to);

  console.log(`Backfill plan: ${versions.length} versions (${versions[0]} -> ${versions[versions.length - 1]})`);
  console.log('Each version: fetch -> parse -> summarize. Steps already done on disk are skipped (resumable).\n');

  const stats = { done: [], skipped: [], failed: [], totalChanges: 0 };

  for (const version of versions) {
    await processVersion(version, stats);
  }

  console.log('\n=== Backfill summary ===');
  console.log(`Done: ${stats.done.length} versions, ${stats.totalChanges} total changes recorded`);
  console.log(`Skipped (no changelog at this path, likely pre-1.3): ${stats.skipped.join(', ') || 'none'}`);
  if (stats.failed.length) {
    console.log(`Failed (re-run this script to retry — it will skip completed work):`);
    for (const f of stats.failed) console.log(`  v${f.version} at ${f.stage}: ${f.error}`);
  } else {
    console.log('Failed: none');
  }

  if (skipJourneys) {
    console.log('\n--skip-journeys set, not running group-feature-journeys.');
    return;
  }
  if (stats.failed.length) {
    console.log('\nSkipping group-feature-journeys because some versions failed — fix and re-run first.');
    return;
  }

  console.log('\n=== Group feature journeys (cross-version, runs once) ===');
  await groupFeatureJourneys();
}

main().catch((err) => {
  console.error('Orchestrator failed:', err.message);
  process.exit(1);
});
