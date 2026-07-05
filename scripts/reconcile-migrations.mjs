#!/usr/bin/env node
/**
 * ClickFlash Migration Reconciliation Script
 *
 * Scans packages/database/migrations for duplicate app migrations
 * (same app + sequence number + description) and archives duplicates,
 * keeping the earliest timestamp as the canonical file.
 *
 * Preserves all SQL content; nothing is deleted. Conflicts with differing
 * content are flagged for manual review.
 */

import { readdir, readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'packages', 'database', 'migrations');
const ARCHIVE_DIR = join(MIGRATIONS_DIR, 'archive');

const filenameRegex = /^(\d{14})_((?:gallery|management|moneytrash|master|touch|master-cpp|claude-code)_\d+_[^.]+)\.sql$/;

async function main() {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.sql') && filenameRegex.test(e.name))
    .map((e) => e.name)
    .sort();

  /** @type {Map<string, {name: string, timestamp: string, content: string}[]>} */
  const groups = new Map();

  for (const name of files) {
    const match = name.match(filenameRegex);
    if (!match) continue;
    const [, timestamp, key] = match;
    const content = await readFile(join(MIGRATIONS_DIR, name), 'utf8');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ name, timestamp, content });
  }

  const archived = [];
  const conflicts = [];
  const canonical = [];

  await mkdir(ARCHIVE_DIR, { recursive: true });

  for (const [key, items] of groups.entries()) {
    if (items.length === 1) {
      canonical.push(items[0].name);
      continue;
    }

    // Keep earliest timestamp as canonical
    items.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const [winner, ...rest] = items;
    canonical.push(winner.name);

    for (const dup of rest) {
      const identical = dup.content === winner.content;
      if (!identical) {
        conflicts.push({ key, canonical: winner.name, conflict: dup.name });
      }
      const archiveName = identical
        ? `${dup.name}.duplicate-of-${winner.name}`
        : `${dup.name}.CONFLICT-REVIEW`;
      await rename(join(MIGRATIONS_DIR, dup.name), join(ARCHIVE_DIR, archiveName));
      archived.push({
        key,
        moved: dup.name,
        archiveName,
        identical,
        canonical: winner.name,
      });
    }
  }

  const report = [
    '# Migration Reconciliation Report',
    `\nGenerated: ${new Date().toISOString()}`,
    `\nTotal SQL files scanned: ${files.length}`,
    `Canonical migrations retained: ${canonical.length}`,
    `Duplicate migrations archived: ${archived.length}`,
    `Content conflicts requiring manual review: ${conflicts.length}`,
    '\n## Archived Duplicates',
    ...(archived.length
      ? archived.map(
          (a) =>
            `- \`${a.moved}\` → \`archive/${a.archiveName}\` (canonical: \`${a.canonical}\`, identical: ${a.identical})`
        )
      : ['_No duplicates found._']),
    '\n## Conflicts Requiring Manual Review',
    ...(conflicts.length
      ? conflicts.map((c) => `- \`${c.conflict}\` differs from canonical \`${c.canonical}\` for key \`${c.key}\``)
      : ['_No content conflicts._']),
    '\n## Canonical Migrations Retained',
    ...canonical.map((c) => `- \`${c}\``),
  ].join('\n');

  await writeFile(join(MIGRATIONS_DIR, 'RECONCILIATION_REPORT.md'), report, 'utf8');

  console.log(`Scanned ${files.length} migrations.`);
  console.log(`Retained ${canonical.length} canonical files.`);
  console.log(`Archived ${archived.length} duplicates to ${ARCHIVE_DIR}.`);
  console.log(`Conflicts: ${conflicts.length}.`);
  console.log('Report written to packages/database/migrations/RECONCILIATION_REPORT.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
