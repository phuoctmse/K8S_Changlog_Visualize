#!/usr/bin/env node
/**
 * Parse a raw CHANGELOG-x.y.md into structured "raw" JSON — one entry per
 * bullet point, grouped by section (Deprecation, API Change, Feature, ...).
 *
 * This is the PRE-Claude-API stage: no summarization, no categorization,
 * no why_it_matters — just faithful extraction of what's actually in the
 * official changelog. The next pipeline stage (summarize-changelog.mjs,
 * not built yet) will take this raw JSON and call the Claude API to
 * produce the final /data/versions/{version}.json described in the
 * project schema (category, summary, why_it_matters, breaking_change,
 * is_milestone, feature_journey_id).
 *
 * Usage: node parse-changelog.mjs 1.29
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAW_DIR = path.resolve('data/raw');
const OUT_DIR = path.resolve('data/parsed');

// Sections we care about — everything else (Downloads, Dependencies,
// Container Images, Failing Test, Other/Cleanup, Uncategorized) is noise
// for a "what changed and why it matters" learning site and is dropped.
const KEEP_SECTIONS = new Set([
  'Deprecation',
  'API Change',
  'Feature',
  'Bug or Regression',
  'Documentation',
  'Urgent Upgrade Notes',
]);

/**
 * Find the byte range of the main "since previous minor" changelog section.
 * A CHANGELOG-x.y.md file contains many "## Changelog since vX.Y.Z" blocks
 * (one per patch release). The one we want is the LAST one in the file —
 * it's the original "since v{x}.{y-1}.0" section covering the full minor
 * release, and appears at the bottom because entries are prepended over time.
 */
function extractMainSection(text) {
  const sectionRe = /^## Changelog since v[\d.]+(?:-[\w.]+)?\s*$/gm;
  const matches = [...text.matchAll(sectionRe)];
  if (matches.length === 0) {
    throw new Error('No "## Changelog since" section found');
  }
  const last = matches[matches.length - 1];
  const start = last.index;
  // Section ends at the next "## Downloads for" heading, or end of file.
  const downloadsRe = /^## Downloads for/m;
  const rest = text.slice(start);
  const endMatch = rest.match(downloadsRe);
  const end = endMatch ? start + endMatch.index : text.length;
  return text.slice(start, end);
}

/**
 * Split a section body into subsections keyed by "### Heading".
 */
function splitBySubheading(sectionText) {
  const parts = sectionText.split(/^### (.+)$/m);
  // parts[0] is preamble before the first ###; then alternating [heading, body, heading, body, ...]
  const subsections = {};
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim();
    const body = parts[i + 1] ?? '';
    subsections[heading] = (subsections[heading] ?? '') + body;
  }
  return subsections;
}

/**
 * Split a subsection body into individual bullet entries. Entries are
 * top-level "- " bullets; a bullet's own text may itself contain nested
 * "  - " sub-bullets or indented continuation lines, which we keep as
 * part of that entry's raw text rather than splitting further.
 */
function splitBullets(body) {
  const lines = body.split('\n');
  const bullets = [];
  let current = null;
  for (const line of lines) {
    const isTopLevelBullet = /^- /.test(line);
    if (isTopLevelBullet) {
      if (current) bullets.push(current.join('\n').trim());
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) bullets.push(current.join('\n').trim());
  return bullets.filter(Boolean);
}

/**
 * Pull structured metadata out of a bullet's trailing
 * "([#12345](pr-url), [@author](author-url)) [SIG A, SIG B]" markers.
 * Returns { text, pr_number, pr_url, author, sigs }. `text` has the
 * markers stripped and is trimmed.
 */
function extractMetadata(raw) {
  let text = raw;
  let pr_number = null;
  let pr_url = null;
  let author = null;
  const sigs = [];

  const sigMatch = text.match(/\[(SIG[^\]]+)\]\s*$/);
  if (sigMatch) {
    sigs.push(
      ...sigMatch[1]
        .replace(/^SIG\s*/, '')
        .split(/,\s*|\s+and\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    );
    text = text.slice(0, sigMatch.index).trimEnd();
  }

  const prMatch = text.match(
    /\(\[#(\d+)\]\(([^)]+)\),\s*\[@([\w-]+)\]\(([^)]+)\)\)\s*$/
  );
  if (prMatch) {
    pr_number = Number(prMatch[1]);
    pr_url = prMatch[2];
    author = prMatch[3];
    text = text.slice(0, prMatch.index).trimEnd();
  }

  // Leading "- " and a possible "#### " sub-heading marker some entries use
  text = text.replace(/^- (#### )?/, '').trim();

  return { text, pr_number, pr_url, author, sigs };
}

export async function parseChangelog(minorVersion) {
  const rawPath = path.join(RAW_DIR, `${minorVersion}.md`);
  const text = await fs.readFile(rawPath, 'utf-8');

  const mainSection = extractMainSection(text);
  const subsections = splitBySubheading(mainSection);

  const entries = [];
  for (const [heading, body] of Object.entries(subsections)) {
    if (!KEEP_SECTIONS.has(heading)) continue;
    const bullets = splitBullets(body);
    for (const bullet of bullets) {
      const meta = extractMetadata(bullet);
      if (!meta.text) continue;
      // Skip PR-template boilerplate ("this section can be blank if...")
      // that slips through when a contributor didn't fill in a release note.
      if (/<!--[\s\S]*This section can be blank/i.test(bullet)) continue;
      entries.push({
        source_section: heading,
        raw_text: meta.text,
        pr_number: meta.pr_number,
        pr_url: meta.pr_url,
        author: meta.author,
        sigs: meta.sigs,
      });
    }
  }

  const result = {
    version: minorVersion,
    source_url: `https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-${minorVersion}.md`,
    parsed_at: new Date().toISOString(),
    entry_count: entries.length,
    entries,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${minorVersion}.json`);
  await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Parsed ${entries.length} entries -> ${outPath}`);
  return result;
}

// CLI entry
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node parse-changelog.mjs <minor-version, e.g. 1.29>');
    process.exit(1);
  }
  parseChangelog(version).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
