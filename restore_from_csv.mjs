// Restore a cohort's trial records into Supabase from a trials_full.csv export.
// Built for the 2026-09-17 "3 mo Tau" rescue (cohort + day shells exist online,
// records lost in a sync outage). Records are rebuilt per (day, mouse) from the
// CSV: trials T1-T8 (+T9), weight, notes, reversal (from phase).
//   node restore_from_csv.mjs metadata_backup/2026-09-17_3_mo_Tau_trials_full.csv "3 mo Tau" [--dry]
import { readFileSync } from 'node:fs';

const SB_URL = 'https://xgiqhkcpssakrlemvodx.supabase.co';
const KEY = 'sb_publishable_qbDIUER221OxvA_HvwhpCw_-V5OsMcD';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const [, , file, name, ...flags] = process.argv;
const DRY = flags.includes('--dry');
if (!file || !name) { console.error('Usage: node restore_from_csv.mjs <trials_full.csv> "<cohort name>" [--dry]'); process.exit(1); }

// --- fetch the online cohort + its existing days/records
const cohorts = await (await fetch(`${SB_URL}/rest/v1/tmaze_cohorts?select=*`, { headers: H })).json();
const c = cohorts.find(x => (x.meta?.name || '').trim() === name.trim());
if (!c) { console.error(`Cohort "${name}" not online. Names: ${cohorts.map(x => x.meta?.name).join(', ')}`); process.exit(1); }
const days = await (await fetch(`${SB_URL}/rest/v1/tmaze_days?cohort_id=eq.${c.id}&select=*`, { headers: H })).json();
const existing = await (await fetch(`${SB_URL}/rest/v1/tmaze_records?cohort_id=eq.${c.id}&select=day_index,mouse_id`, { headers: H })).json();
const haveRec = new Set(existing.map(r => r.day_index + ':' + r.mouse_id));
const haveDay = new Set(days.map(d => d.day_index));
const miceOnline = new Set((c.meta?.mice || []).map(m => m.id));

// --- parse the CSV (plain commas; export replaced commas in notes with ';')
const lines = readFileSync(file, 'utf8').trim().split(/\r?\n/);
const hdr = lines[0].split(',');
const col = k => hdr.indexOf(k);
const [iDay, iDate, iPhase, iMouse, iWt, iT1, iT9, iNotes] =
  [col('day'), col('date'), col('phase'), col('mouse'), col('weight'), col('T1'), col('T9'), col('notes')];

const recs = [], newDays = new Map(), csvMice = new Set();
for (const line of lines.slice(1)) {
  const f = line.split(',');
  const dayN = parseInt(String(f[iDay]).replace(/^DAY/i, ''), 10);
  if (Number.isNaN(dayN)) continue;
  const mouse = f[iMouse]; csvMice.add(mouse);
  const trials = [];
  for (let k = 0; k < 8; k++) trials.push(f[iT1 + k] || '');
  const t9 = f[iT9] || '';
  if (t9) trials.push(t9);
  recs.push({ cohort_id: c.id, day_index: dayN, mouse_id: mouse,
    data: { reward: '', trials, weight: f[iWt] || '', notes: f[iNotes] || '', reversal: (f[iPhase] || '') === 'reversal' } });
  if (!haveDay.has(dayN) && !newDays.has(dayN)) newDays.set(dayN, { cohort_id: c.id, day_index: dayN, meta: { date: f[iDate] || '' } });
}

const fresh = recs.filter(r => !haveRec.has(r.day_index + ':' + r.mouse_id));
const skipped = recs.length - fresh.length;
const unknownMice = [...csvMice].filter(m => !miceOnline.has(m));

console.log(`Online cohort "${c.meta.name}" (id ${c.id}) — ${days.length} day rows, ${existing.length} records already online`);
console.log(`CSV: ${recs.length} (day,mouse) records across days ${[...new Set(recs.map(r => r.day_index))].sort((a,b)=>a-b).join(', ')} · ${csvMice.size} mice`);
console.log(`To write: ${fresh.length} records${skipped ? ` (${skipped} already online — left untouched)` : ''}${newDays.size ? `, ${newDays.size} new day row(s): ${[...newDays.keys()].join(', ')}` : ''}`);
if (unknownMice.length) console.log(`⚠ mice in CSV but not in the online cohort's mouse list: ${unknownMice.join(', ')}`);
if (DRY) { console.log('--dry: nothing written.'); process.exit(0); }

async function upsert(table, rows) {
  if (!rows.length) return;
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, { method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} — ${await res.text()}`);
}
const stamp = new Date().toISOString();
await upsert('tmaze_days', [...newDays.values()].map(d => ({ ...d, updated_at: stamp, updated_by: 'csv_restore' })));
await upsert('tmaze_records', fresh.map(r => ({ ...r, updated_at: stamp, updated_by: 'csv_restore' })));
console.log(`Restored ${fresh.length} records. Refresh the live app to verify.`);
