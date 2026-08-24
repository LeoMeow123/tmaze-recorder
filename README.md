# T-Maze Recorder

Web app for recording T-maze behavioral trials, replacing Google Sheets with a purpose-built interface.

**Live app:** https://leomeow123.github.io/tmaze-recorder/

## Features

- **Multi-cohort management** — create and switch between cohorts with age, genotype, and sex tracking; **delete a mistaken cohort** from the list (🗑 — cohorts with recorded data require typing the name to confirm; soft-deleted, recoverable from the database)
- **Day 0 preference test** — 8 trials per mouse; preferred side auto-calculated from majority and used as reward side for all subsequent days. A **DONE ✓ badge appears automatically** once the majority is mathematically secured (e.g. 5/8 to one side) — no hand-counting the remaining trials
- **Click-to-record trials** — tap cells to toggle L/R; correct/wrong colored automatically based on reward side
- **Auto-calculated dates** — set Day 0 date, all other days compute as Day 0 + N
- **Per-mouse reversal marking** — only **LEARNED** mice can start reversal; marking it **flips the reward side back to the Day-0 preferred side** and **resets LEARNED** while the mouse re-learns, then shows **LEARNED (R) ✓** once it reaches criterion again on reversal days; carries forward to new days
- **Weight monitoring** — SVG chart, baseline tracking, alerts for >15% baseline drop or >10% day-over-day drop
- **Weights tab** — dedicated weight-only view across all days with baseline/current/change summary
- **Real mouse IDs** — enter actual ear tag IDs via the reorder modal; mask IDs (M1, F1) used as placeholders
- **Drag-to-reorder** — set recording sequence by dragging rows
- **STRIDE-compatible CSV export** — `meta_trials.csv`, `T-maze-metadata.csv`, full trials, and weights
- **Live Supabase sync** — every edit saves automatically (~1 s, debounced), per row; multiple people (or two tabs) recording different experiments can't overwrite each other
- **Finish-Day GitHub backup** — pressing *Finish Day* commits one `data.json` snapshot to GitHub (the only GitHub write; no more 5-min commit spam)

## Setup

1. Open the [live app](https://leomeow123.github.io/tmaze-recorder/) — live sync is built in, nothing to configure.
2. (Optional) Click the gear icon to set **your name** (for edit history) and, if you want the Finish-Day backup, a **GitHub token** (fine-grained, Contents read+write on `tmaze-recorder`).
3. Create a new cohort, enter male/female counts and genotypes
4. Set mouse IDs and recording order in the reorder modal
5. Record Day 0, then add days as needed

## Data storage

Live data lives in **Supabase** (shares the Lee Lab colony project — publishable key, permissive RLS). It's stored **granularly**, one row per level, so concurrent recorders never clobber each other:

- `tmaze_cohorts` — one row per cohort (name/age/genotypes/mice as a JSONB blob)
- `tmaze_days` — one row per (cohort, day) — date, locked, phase…
- `tmaze_records` — one row per (cohort, day, mouse) — trials/weight/notes/reward as a JSONB blob

**How saving works:** every edit writes to `localStorage` instantly, then a debounced (~1.2 s) sync **upserts only the rows that changed**. On load, the app **reconciles** the server copy with any unsynced local rows (so a fast refresh after "Add Day" never loses it), and a tab-hidden flush pushes pending edits. **GitHub** now only receives a `data.json` snapshot when you press **Finish Day** (backup/archive).

**Setup (one-time):** run `tmaze_migration.sql` in the Supabase SQL editor to create the tables, then `node import_data.mjs` to import an existing `data.json`. Both are in this repo.
