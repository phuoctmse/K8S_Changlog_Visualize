#!/usr/bin/env node
/**
 * Fetch raw CHANGELOG-x.y.md from kubernetes/kubernetes for a given minor version.
 * Usage: node fetch-changelog.mjs 1.29
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const RAW_BASE = 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/CHANGELOG';
const RAW_DIR = path.resolve('data/raw');

export async function fetchChangelog(minorVersion) {
  const url = `${RAW_BASE}/CHANGELOG-${minorVersion}.md`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  await fs.mkdir(RAW_DIR, { recursive: true });
  const outPath = path.join(RAW_DIR, `${minorVersion}.md`);
  await fs.writeFile(outPath, text, 'utf-8');
  console.log(`Saved ${outPath} (${text.length} bytes)`);
  return text;
}

// CLI entry
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node fetch-changelog.mjs <minor-version, e.g. 1.29>');
    process.exit(1);
  }
  fetchChangelog(version).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
