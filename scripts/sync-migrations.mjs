#!/usr/bin/env node
/**
 * Writes the database's applied migrations back into supabase/migrations/.
 *
 *   node scripts/sync-migrations.mjs
 *
 * The schema is part of the record. export-seeds.mjs preserves the rows so the archive can
 * leave this hosting account; this preserves the shape they go back into, so the database
 * can be rebuilt rather than reverse-engineered. Between them the repo holds everything
 * needed to stand the archive up somewhere else.
 *
 * Existing files are left alone — a migration already in git is the reviewed copy, and the
 * database's own record of it has been reformatted by the migration runner.
 */
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { selectAll } from './supabase.mjs';

const DIR = 'supabase/migrations';
mkdirSync(DIR, { recursive: true });
const have = new Set(readdirSync(DIR).map((f) => f.split('_')[0]));

const rows = await selectAll('v_migrations', { order: 'version.asc', schema: 'api' });
let written = 0;
let skipped = 0;
for (const m of rows) {
  const file = join(DIR, `${m.version}_${m.name}.sql`);
  if (existsSync(file) || have.has(m.version)) { skipped++; continue; }
  writeFileSync(file, `${m.sql.trimEnd()}\n`);
  written++;
  console.log(`    + ${m.version}_${m.name}.sql`);
}
console.log(`\n  sync-migrations: ${written} written, ${skipped} already in the repo\n`);
