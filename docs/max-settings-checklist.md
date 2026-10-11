# Max settings checklist (Ostfront DB)

Repo-side security is in CI and code. These items need your Neon / Vercel / GitHub toggles.

## Neon apply order (test branch first)

Use a Neon **test** branch before production. Connect as `neondb_owner` (unpooled).

1. Apply `drizzle/0000_odd_mercury.sql`
2. Apply `drizzle/0001_search_extensions.sql` (pg_trgm, unaccent, trigram indexes)
3. Apply `drizzle/0002_slug_checks.sql` (slug/color CHECKs, `primary_image_id` FK)
4. Apply `drizzle/roles.sql` (creates `goh_etl` / `goh_app_ro` **without** passwords)
5. Set passwords interactively:
   - `\password goh_etl`
   - `\password goh_app_ro`
6. Run the verify SQL block commented at the bottom of `drizzle/roles.sql`
7. Confirm neither role is a member of `neon_superuser`

## Vercel

- Set only the **pooled** `DATABASE_URL` for user `goh_app_ro` (host contains `-pooler`)
- Do **not** set `DATABASE_URL_OWNER`, `DATABASE_URL_ETL`, or Neon-injected `POSTGRES_*` owner URLs
- Set `REVALIDATE_SECRET` (≥ 32 bytes, Secret type) and `NEXT_PUBLIC_SITE_URL`
- Separate Production / Preview env values

## WAF / rate limits (security-p0 #19)

Add a Vercel Firewall (WAF) **rate limit** on:

- `POST /api/revalidate` (strict; low RPS, e.g. burst-friendly for ETL only)
- Broader `/api/*` and heavy list routes such as `/units` if abuse appears

Also keep method-deny rules for unused verbs on read-only paths. Cap Neon compute (max CU).

## GitHub

- [ ] Enable Dependency graph (unblocks Dependency review CI)
- [ ] Branch protection on `main`
- [ ] Secret scanning + push protection
- [ ] Environment `production-data` for ETL secrets only (`DATABASE_URL_ETL`)
