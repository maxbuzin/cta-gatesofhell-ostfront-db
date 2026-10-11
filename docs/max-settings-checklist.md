# Max settings checklist (Ostfront DB)

Repo-side security is in CI and code. These items need your Neon / Vercel / GitHub toggles.

## GitHub (do Dependency graph first)

- [ ] **Enable Dependency graph** (Settings → Code security → Dependency graph). Unblocks the Dependency review CI job.
- [ ] Branch protection on `main` (PR required, required checks, CODEOWNERS review, no force push/delete)
- [ ] Secret scanning + push protection
- [ ] Environment `production-data` for ETL secrets only (`DATABASE_URL_ETL`)

## Neon apply order (test branch first)

Connect as `neondb_owner` (unpooled) on a **test** branch before production.

1. Apply `drizzle/0000_odd_mercury.sql` (owner, unpooled)
2. Apply `drizzle/0001_search_extensions.sql` (search / trigram)
3. Apply `drizzle/0002_slug_checks.sql` (slug/color CHECKs, FKs)
4. Apply `drizzle/roles.sql` (roles **without** passwords)
5. `\password goh_etl` then `\password goh_app_ro`
6. Verify SQL at bottom of `roles.sql` (`pg_has_role(...,'neon_superuser')` false; `SET ROLE goh_app_ro`; INSERT must fail)
7. Cap Neon CU; enable usage/billing alerts

Vercel: only pooled `goh_app_ro` `DATABASE_URL`. Never put owner URL or `DATABASE_URL_ETL` on Vercel. ETL URL only in GitHub env `production-data`.

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
