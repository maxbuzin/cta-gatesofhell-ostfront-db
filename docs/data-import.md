# Data import (Google Sheet → Neon)

Plain-English guide for running the Ostfront DB sheet import. The website never writes to the database; only this ETL does, and only with the `goh_etl` role.

## What gets imported

Source: Google Sheet **CtA - gates of hell ostfront**  
Spreadsheet id: `1elHuL52C8EJvYa4Zaxo4yUu0DyCjK2RK0Q8Z70Th0fc`

Ten visible tabs are imported (hidden **Mech** is skipped). Column mapping lives in `etl/sheet-mapping.json` (validated by Backend dry-run).

Backend dry-run expectation (full sheet):

- **1,084** units (1,089 rows read; 4 exact duplicates merged; 1 conflict rejected)
- **1,013** units with stats
- **211** weapons
- **5** factions

## Export the sheet (local CSVs)

Licensing is not confirmed yet — **do not commit raw CSVs**.

1. Open the spreadsheet in Google Sheets.
2. For each visible tab, **File → Download → Comma Separated Values (.csv)**.
3. Rename files to match the mapping (see `etl/sheet-mapping.json` → `tabs.*.csv`), e.g. `infantry.csv`, `tanks.csv`, …
4. Put them in a folder under `data/raw/` (gitignored), e.g. `data/raw/2026-10-11/`.

Or share the sheet to “anyone with the link” and let `pnpm etl --dry-run` fetch CSV exports automatically.  
Optional: set `GOOGLE_SERVICE_ACCOUNT_JSON` (read-only Sheets scope) in the GitHub Environment **`production-data` only** — never a personal Google login, never commit the JSON.

## Dry-run (no database writes)

```bash
pnpm etl --dry-run --patch current --from data/raw/2026-10-11 --expect
```

Prints transform counts (units, merged, rejected, …) and writes `data/reports/etl-current.md` (gitignored). `--expect` compares to the Backend dry-run lock (1084 units, etc.).

## Write run (Neon)

Requires migrations + `roles.sql` already applied.

```bash
export DATABASE_URL_ETL='postgres://goh_etl:…@…-pooler…/neondb'
pnpm etl --patch current --from data/raw/2026-10-11
```

Rules:

- Whole run is **one transaction** — any failure rolls back everything.
- Upserts by natural key (`units.slug`, stats/costs by unit + game version).
- Running twice with the same data should report **zero changes**.
- User must be **`goh_etl`**. Owner and `goh_app_ro` URLs are refused.
- After a successful write, if `SITE_URL` (or `NEXT_PUBLIC_SITE_URL`) and `REVALIDATE_SECRET` are set, ETL calls `POST /api/revalidate`. Otherwise it skips quietly.

Never put `DATABASE_URL_ETL` or `GOOGLE_SERVICE_ACCOUNT_JSON` on Vercel. Keep them in GitHub **`production-data`** (or your local `.env.local`, which is gitignored).

## Overrides (contributor PRs)

Contributors can fix typos, force unit types, or pin slugs without editing the sheet.

1. Copy `data/overrides/example.json` to a new file (e.g. `data/overrides/my-fix.json`) — `example.json` itself is not applied.
2. Follow `data/overrides/schema.json`.
3. Overrides take **top priority** over sheet values / heuristics.
4. Open a PR. Reviewers check that slugs stay stable (`etl/slug-lock.json` may update on write runs).

Example keys use `tab:faction-slug:Unit Name` (name after typo normalization).

## Commands summary

| Command | Effect |
|---|---|
| `pnpm etl --dry-run --from …` | Transform only + report |
| `pnpm etl --from …` | Write transactionally to Neon |
| `pnpm etl --dry-run` | Fetch sheet (public CSV or service account) |

`--patch` defaults to `current` (stored in `game_versions.code`).

## Security notes

- Sheet/wiki text is untrusted: Zod/plain-text sanitization, length caps, slug regex.
- `etl/**` is not imported by the Next.js app.
- No ETL step in CI lifecycle scripts. CI only runs the parser on `etl/fixtures/synthetic`.
