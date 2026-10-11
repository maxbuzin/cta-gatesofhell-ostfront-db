-- Custom migration: search extensions only (before trgm indexes / immutable_unaccent usage).
-- Applied via `DATABASE_URL_OWNER=... pnpm db:migrate` on Max's machine.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
