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
- [ ] **Never** put `DATABASE_URL_OWNER` in GitHub Actions secrets or any workflow

## Neon apply order (test branch first)

Connect as `neondb_owner` (unpooled) on a **test** branch before production. Create roles **via SQL, not the Console** (Console roles get `neon_superuser`).

**Do not** paste `drizzle/0000_*.sql` / later migrations into psql by hand. Use the migrate script so the journal stays consistent.

1. On Max's machine only: `DATABASE_URL_OWNER=<unpooled owner URL> pnpm db:migrate`
2. `\i drizzle/roles.sql` as `neondb_owner` (roles **without** passwords)
3. `\password goh_app_ro` then `\password goh_etl` (outside saved SQL history)
4. Verify SQL at bottom of `roles.sql` (`pg_has_role(...,'neon_superuser')` false; `SET ROLE goh_app_ro`; INSERT must fail)
5. Cap Neon max CU; billing alerts

### `db:migrate` guardrail

- Run **only** manually on Max's machine with `DATABASE_URL_OWNER`.
- Never wire `db:migrate` / `drizzle-kit migrate` / `DATABASE_URL_OWNER` into `build`, `vercel-build`, `postinstall`, `prebuild`, CI workflows, or Vercel.
- CI security gates fail if those strings appear in package.json lifecycle scripts, `vercel.json`, or `.github/workflows/**`.

## Vercel

- [ ] Node 24 runtime
- [ ] Delete integration-injected owner vars (`POSTGRES_*`, `DATABASE_URL_UNPOOLED`, any non-RO URL)
- [ ] Keep only the **pooled** `DATABASE_URL` for user `goh_app_ro` (Production Sensitive)
- [ ] **Never** set `DATABASE_URL_OWNER` (or any owner/unpooled URL) in Vercel
- [ ] Separate `REVALIDATE_SECRET` per env (Prod/Preview), ≥ 32 random bytes, Sensitive
- [ ] Set `NEXT_PUBLIC_SITE_URL` per env; Preview uses a Neon branch or no DB
- [ ] Deployment Protection + Git Fork Protection on
- [ ] Spend Management hard cap
- [ ] WAF rate limits on `/api/*` (esp. `POST /api/revalidate` and `/api/csp-report`), `/units`, `/compare`; oversized-query-string rule

## Launch

- [ ] Apply Next.js Oct 14 2026 security release before public launch (separate PR)
- [ ] Backups: restore drill + weekly data dump
- [ ] Pre-launch pentest checklist (semgrep, headers, ZAP, etc.)
