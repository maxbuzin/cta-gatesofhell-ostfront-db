# ETL

Imports the Ostfront Google Sheet into Neon. The site stays read-only.

The spreadsheet must be shared as anyone with the link can view. The importer downloads each visible tab as CSV. No Google API key. Hidden tab Mech is skipped. Research trees and popular comparisons are not in the sheet.

## Run

Dev branch first, role `goh_etl`:

```bash
DATABASE_URL_ETL="postgresql://..." pnpm etl --patch sheet
```

`DATABASE_URL_ETL` stays off Vercel. GitHub environment `production-data` holds it for `.github/workflows/etl.yml`.

The weekly run uses patch code `sheet`. A manual run uses the patch input and marks that game version current.

Pages read pooled `DATABASE_URL` for `goh_app_ro`. Without that URL, the UI stays empty.

`--dry-run` fetches and maps the sheet and does not open the database.
