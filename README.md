# Ostfront DB

Free, open-source, no-login unit database for *Call to Arms – Gates of Hell: Ostfront*.

Turbo spreadsheet: search units, read stats, compare side by side, explore Conquest research trees.

## Stack

- Next.js 16.4 + React 19.3 + TypeScript 5.x
- Tailwind CSS 4.3.3 + shadcn/ui (Radix) + lucide-react
- Neon Postgres + Drizzle ORM (read-only app role)
- Vercel hosting

## Local development

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

No `DATABASE_URL` is required for UI development. Pages render empty states when the database is absent or empty.

Optional env (see `.env.example`):

- `DATABASE_URL` – Neon connection string for `goh_app_ro`
- `REVALIDATE_SECRET` – Bearer token for `POST /api/revalidate` (≥ 32 bytes)
- `NEXT_PUBLIC_SITE_URL` – canonical site URL

## Scripts

- `pnpm lint` – ESLint
- `pnpm typecheck` – `tsc --noEmit`
- `pnpm build` – production build
- `pnpm db:generate` – Drizzle migrations from schema

## Licenses

- Code: MIT
- Data: CC BY-SA 4.0 (see `DATA_LICENSE.md`)

Not affiliated with Barbedwire Studios / 1C Entertainment / Digitalmindsoft.
