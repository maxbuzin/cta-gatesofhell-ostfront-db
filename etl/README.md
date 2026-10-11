# ETL (out of scope for v1 site PR)

This folder is a stub for the future import pipeline.

The website is read-only. Data lands in Neon via scripts that will live here:

1. Fetch sources (Google Sheet CSV, Fandom wiki API, overrides)
2. Validate with Zod
3. Upsert into Postgres using the `goh_etl` role
4. Build `public/search-index.json`
5. `POST /api/revalidate` with Bearer `REVALIDATE_SECRET`

Do not put `DATABASE_URL_ETL` in Vercel. Keep it in GitHub Actions environment `production-data` only.
