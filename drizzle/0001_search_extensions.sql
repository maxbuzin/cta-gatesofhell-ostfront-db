-- Custom migration: search extensions and trigram indexes
-- Apply after 0000_odd_mercury.sql, as Neon owner (neondb_owner).
-- Generated as drizzle-kit custom migration (search / trigram).

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE INDEX IF NOT EXISTS units_search_trgm_idx
  ON units USING gin (search_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS unit_aliases_trgm_idx
  ON unit_aliases USING gin (lower(immutable_unaccent(alias)) gin_trgm_ops);
