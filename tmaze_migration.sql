-- ============================================================================
-- T-maze recorder → Supabase live store.
-- Run ONCE in the Supabase SQL editor (Lee Lab colony project). Safe to re-run.
-- One row per cohort / (cohort,day) / (cohort,day,mouse) so concurrent recorders
-- editing DIFFERENT mice on the same day never overwrite each other. Each row keeps
-- its content as a verbatim JSONB blob, so any field (phase, reversal, future ones)
-- round-trips losslessly.
-- ============================================================================

create table if not exists tmaze_cohorts (
  id text primary key,
  meta jsonb,                      -- {name, age, genotypes, mice:[...], created, ...}
  updated_at timestamptz default now(),
  updated_by text
);

create table if not exists tmaze_days (
  cohort_id text references tmaze_cohorts(id) on delete cascade,
  day_index int not null,
  meta jsonb,                      -- {date, locked, phase, ...} (everything except trials)
  updated_at timestamptz default now(),
  updated_by text,
  primary key (cohort_id, day_index)
);

create table if not exists tmaze_records (
  cohort_id text,
  day_index int not null,
  mouse_id text,
  data jsonb,                      -- {reward, trials:[...], weight, notes, reversal, ...}
  updated_at timestamptz default now(),
  updated_by text,
  primary key (cohort_id, day_index, mouse_id)
);
create index if not exists tmaze_records_cohort_day_idx on tmaze_records(cohort_id, day_index);

-- Grants + permissive RLS (same "soft" model as the colony: open read/write via the
-- publishable key, attributed by updated_by; tighten with Supabase Auth later if needed).
grant select, insert, update, delete on tmaze_cohorts, tmaze_days, tmaze_records to anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['tmaze_cohorts','tmaze_days','tmaze_records'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t||'_all', t);
    execute format('create policy %I on %I for all using (true) with check (true);', t||'_all', t);
  end loop;
end $$;
