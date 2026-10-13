# ETL

The live import reads `data/snapshots/game-units.json` and writes Neon. The site stays read-only.

```bash
DATABASE_URL_ETL="postgresql://..." pnpm etl
```

Patch code defaults to `game` and becomes the current version. Older sheet rows stay in the database.

The Google Sheet importer is still available:

```bash
DATABASE_URL_ETL="postgresql://..." pnpm etl:sheet --patch sheet
```

`DATABASE_URL_ETL` stays off Vercel. GitHub environment `production-data` holds it for `.github/workflows/etl.yml`.

The weekly run uses patch code `game`. A manual run uses the patch input and marks that game version current.

Pages read pooled `DATABASE_URL` for `goh_app_ro`. Without that URL, pages read the snapshot file from disk.

`--dry-run` maps the snapshot and does not open the database.
