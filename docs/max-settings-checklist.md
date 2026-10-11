# Max settings checklist (Ostfront DB)

Repo-side security is in CI and code. These items need your Neon / Vercel / GitHub toggles.

## GitHub (do Dependency graph first)

- [ ] **Enable Dependency graph** (Settings → Code security → Dependency graph). Unblocks the Dependency review CI job.
- [ ] Branch protection on `main` (PR required, required checks, CODEOWNERS review, no force push/delete)
- [ ] Secret scanning + push protection
- [ ] Environment `production-data` for ETL secrets only (`DATABASE_URL_ETL`)

## Neon apply order (test branch first)

Connect as `neondb_owner` (unpooled) on a **test** branch before production.

1. Apply `drizzle/0000_odd_mercury.sql`
2. Apply `drizzle/0001_search_extensions.sql` (pg_trgm, unaccent, trigram indexes)
3. Apply `drizzle/0002_slug_checks.sql` (slug/color CHECKs, `primary_image_id` FK)
4. Apply `drizzle/roles.sql` (creates `goh_etl` / `goh_app_ro` **without** passwords)
5. `\password goh_etl` then `\password goh_app_ro`
6. Run the verify SQL block at the bottom of `drizzle/roles.sql`
7. Confirm neither role is a member of `neon_superuser`
8. Cap Neon CU; enable usage/billing alerts

## Vercel

- [ ] Delete integration-injected owner vars (`POSTGRES_*`, `DATABASE_URL_UNPOOLED`, any non-RO URL)
- [ ] Keep only the **pooled** `DATABASE_URL` for user `goh_app_ro` (Sensitive / Secret)
- [ ] Separate `REVALIDATE_SECRET` per env (Prod/Preview), ≥ 32 bytes, Secret type
- [ ] Set `NEXT_PUBLIC_SITE_URL` per env
- [ ] Spend / budget cap on the team
- [ ] WAF rate limits on `/api/*` (especially `POST /api/revalidate`), `/units`, `/compare`
- [ ] Method-deny unused verbs on read-only paths

## Launch

- [ ] Apply Next.js Oct 14 2026 security release before public launch (separate PR)
- [ ] Backups: restore drill + weekly data dump
- [ ] Pre-launch pentest checklist (semgrep, headers, ZAP, etc.)
