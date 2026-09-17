// Import ONE cohort from a localStorage dump (or data.json) into Supabase.
//
// Use this to rescue data recorded on an offline computer:
//   1. On that computer, open the T-maze app page, then DevTools (F12) → Console:
//        copy(localStorage.getItem('tmaze-cache'))
//      Paste into a file (e.g. rescue.json) and bring it here.
//   2. node import_cohort.mjs rescue.json "3 mo Tau"
//      (add --dry to preview without writing)
//
// Safer than import_data.mjs for rescues: it touches ONLY the named cohort, so a
// stale copy of every OTHER cohort in that browser's cache can't clobber newer
// server data. Upserts on primary key — re-running is safe.
import { readFileSync } from 'node:fs';

const SB_URL = 'https://xgiqhkcpssakrlemvodx.supabase.co';
const KEY = 'sb_publishable_qbDIUER221OxvA_HvwhpCw_-V5OsMcD';

const [, , file, name, ...flags] = process.argv;
const DRY = flags.includes('--dry') || name === '--dry';
if (!file || !name || name === '--dry') {
  console.error('Usage: node import_cohort.mjs <dump.json> "<cohort name>" [--dry]');
  process.exit(1);
}

let raw = readFileSync(file, 'utf8').trim();
// tolerate a dump that was double-quoted by copy() or wrapped in quotes
if (raw.startsWith('"') && raw.endsWith('"')) raw = JSON.parse(raw);
const data = JSON.parse(raw);

const c = (data.cohorts || []).find(x => (x.name || '').trim() === name.trim())
       || (data.cohorts || []).find(x => x.id === name.trim());
if (!c) {
  console.error(`Cohort "${name}" not found. Available:`);
  (data.cohorts || []).forEach(x => console.error(`  - "${x.name}" (id ${x.id}, ${(x.days || []).length} days)`));
  process.exit(1);
}

const { days: cdays, id, ...meta } = c;
const days = [], records = [];
for (const dy of (cdays || [])) {
  const { trials, day, ...dmeta } = dy;
  days.push({ cohort_id: id, day_index: day, meta: dmeta });
  for (const mid of Object.keys(trials || {})) {
    records.push({ cohort_id: id, day_index: day, mouse_id: mid, data: trials[mid] });
  }
}

console.log(`Cohort "${c.name}" (id ${id}): 1 cohort row, ${days.length} day(s), ${records.length} mouse-record(s)`);
days.forEach(d => {
  const n = records.filter(r => r.day_index === d.day_index).length;
  const filled = records.filter(r => r.day_index === d.day_index && ((r.data.trials || []).some(x => x) || r.data.weight)).length;
  console.log(`  Day ${d.day_index}: ${n} mice (${filled} with recorded trials/weights)`);
});
if (DRY) { console.log('\n--dry: nothing written.'); process.exit(0); }

async function upsert(table, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json',
                 Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} — ${await res.text()}`);
  }
}

const stamp = new Date().toISOString();
await upsert('tmaze_cohorts', [{ id, meta, updated_at: stamp, updated_by: 'import_cohort' }]);
await upsert('tmaze_days', days.map(d => ({ ...d, updated_at: stamp, updated_by: 'import_cohort' })));
await upsert('tmaze_records', records.map(r => ({ ...r, updated_at: stamp, updated_by: 'import_cohort' })));
console.log(`\nImported. Open the live app and verify "${c.name}" shows every day + trials.`);
