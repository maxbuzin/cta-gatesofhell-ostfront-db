# Max settings checklist (Ostfront DB)

Repo-side security is in CI and code. These items need your Neon / Vercel / GitHub toggles.

## GitHub (do Dependency graph first)

- [ ] **Enable Dependency graph** (Settings → Code security → Dependency graph). Unblocks the Dependency review CI job.
- [ ] Dependabot alerts + security updates
- [ ] Secret scanning (non-provider patterns + validity checks) + push protection
- [ ] Ruleset on `main`: require PR + CODEOWNER review; required checks: "Lint, typecheck, build, security gates", "Dependency review", both CodeQL "Analyze" jobs; block force-push and deletion
- [ ] Actions: require approval for outside contributors' fork PRs; default `GITHUB_TOKEN` read-only; "Allow Actions to create/approve PRs" off
- [ ] Environment `production-data` (required reviewer and/or `main` only) for ETL secrets only (`DATABASE_URL_ETL`)
- [ ] Disable wiki/projects if unused

## Neon apply order (test branch first)

Connect as `neondb_owner` (unpooled) on a **test** branch before production. Create roles **via SQL, not the Console** (Console roles get `neon_superuser`).

1. Apply `drizzle/0000_odd_mercury.sql`
2. Apply `drizzle/0001_search_extensions.sql` (search / trigram)
3. Apply `drizzle/0002_slug_checks.sql` (slug/color CHECKs, FKs)
4. Apply `drizzle/roles.sql` (roles **without** passwords)
5. `\password goh_etl` then `\password goh_app_ro` (outside saved SQL history)
6. Verify SQL at bottom of `roles.sql` (`pg_has_role(...,'neon_superuser')` false; `SET ROLE goh_app_ro`; INSERT must fail)
7. Cap Neon max CU; billing alerts

## Vercel

- [ ] Node 24 runtime
- [ ] Delete integration-injected owner vars (`POSTGRES_*`, `DATABASE_URL_UNPOOLED`, any non-RO URL)
- [ ] Keep only the **pooled** `DATABASE_URL` for user `goh_app_ro` (Production Sensitive)
- [ ] Separate `REVALIDATE_SECRET` per env (Prod/Preview), ≥ 32 random bytes, Sensitive
- [ ] Set `NEXT_PUBLIC_SITE_URL` per env; Preview uses a Neon branch or no DB
- [ ] Deployment Protection + Git Fork Protection on
- [ ] Spend Management hard cap
- [ ] WAF rate limits on `/api/*` (esp. `POST /api/revalidate` and `/api/csp-report`), `/units`, `/compare`; oversized-query-string rule

## Launch

- [ ] Apply Next.js Oct 14 2026 security release before public launch (separate PR)
- [ ] Backups: restore drill + weekly data dump
- [ ] Pre-launch pentest checklist (semgrep, headers, ZAP, etc.)
