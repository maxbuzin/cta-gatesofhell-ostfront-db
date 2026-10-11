# ETL — Google Sheet → Neon

Import pipeline for Ostfront DB. **Not part of the Next.js app bundle** — never import `etl/**` from `src/`.

## Pipeline

`fetch → parse → zod validate → normalize → merge → upsert → report`

## Commands

```bash
# Transform only (no DB writes); writes data/reports/etl-<patch>.md
pnpm etl --dry-run --from data/raw/<dir>

# Write (one transaction; role goh_etl only)
pnpm etl --patch current --from data/raw/<dir>
```

`--patch` defaults to `current`. Optional fetch modes:

1. `--from data/raw/<dir>` — local CSV exports (preferred while licensing is unsettled)
2. Public CSV export URLs (sheet shared “anyone with the link”)
3. `GOOGLE_SERVICE_ACCOUNT_JSON` — read-only Sheets API (GitHub Environment `production-data` only)

## Security

- Connect with `DATABASE_URL_ETL` (`goh_etl` only). Owner / `goh_app_ro` refused.
- No credentials in the repo. Raw CSVs stay in gitignored `data/raw/`.
- Sheet text is untrusted: sanitized plain text, Zod, length caps, slug regex.
- CI runs parser + Zod on `etl/fixtures/synthetic` only — never a live sheet import.

See `docs/data-import.md` for contributor overrides and full workflow.
