# T-Maze Recorder

Web app for recording T-maze behavioral trials, replacing Google Sheets with a purpose-built interface.

**Live app:** https://leomeow123.github.io/tmaze-recorder/

## Features

- **Multi-cohort management** — create and switch between cohorts with age, genotype, and sex tracking
- **Day 0 preference test** — 8 trials per mouse; preferred side auto-calculated from majority and used as reward side for all subsequent days
- **Click-to-record trials** — tap cells to toggle L/R; correct/wrong colored automatically based on reward side
- **Auto-calculated dates** — set Day 0 date, all other days compute as Day 0 + N
- **Per-mouse reversal marking** — toggle reversal status individually; carries forward to new days
- **Weight monitoring** — SVG chart, baseline tracking, alerts for >15% baseline drop or >10% day-over-day drop
- **Weights tab** — dedicated weight-only view across all days with baseline/current/change summary
- **Real mouse IDs** — enter actual ear tag IDs via the reorder modal; mask IDs (M1, F1) used as placeholders
- **Drag-to-reorder** — set recording sequence by dragging rows
- **STRIDE-compatible CSV export** — `meta_trials.csv`, `T-maze-metadata.csv`, full trials, and weights
- **GitHub sync** — manual save + auto-save every 5 min; unsaved change indicator

## Setup

1. Open the [live app](https://leomeow123.github.io/tmaze-recorder/)
2. Click the gear icon to configure GitHub sync (optional)
3. Create a new cohort, enter male/female counts and genotypes
4. Set mouse IDs and recording order in the reorder modal
5. Record Day 0, then add days as needed

## Data storage

- **Local:** `localStorage` for immediate persistence
- **Cloud:** GitHub repo (`data.json`) via the Contents API — requires a personal access token with repo scope
