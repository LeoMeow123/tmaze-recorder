// One-time import of the existing data.json → Supabase tmaze_* tables.
// Run AFTER tmaze_migration.sql has created the tables:
//   node import_data.mjs
// Idempotent (upserts on primary key), so re-running is safe.
import { readFileSync } from 'node:fs';

const SB_URL = 'https://xgiqhkcpssakrlemvodx.supabase.co';
const KEY = 'sb_publishable_qbDIUER221OxvA_HvwhpCw_-V5OsMcD';

const data = JSON.parse(readFileSync(new URL('./data.json', import.meta.url), 'utf8'));

async function upsert(table, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} — ${await res.text()}`);
  }
}

const cohorts = [], days = [], records = [];
for (const c of (data.cohorts || [])) {
  const { days: cdays, id, ...meta } = c;
  cohorts.push({ id, meta });
  for (const dy of (cdays || [])) {
    const { trials, day, ...dmeta } = dy;
    days.push({ cohort_id: id, day_index: day, meta: dmeta });
    for (const mid of Object.keys(trials || {})) {
      records.push({ cohort_id: id, day_index: day, mouse_id: mid, data: trials[mid] });
    }
  }
}

await upsert('tmaze_cohorts', cohorts);
await upsert('tmaze_days', days);
await upsert('tmaze_records', records);
console.log(`Imported ${cohorts.length} cohort(s), ${days.length} day(s), ${records.length} mouse-record(s).`);
