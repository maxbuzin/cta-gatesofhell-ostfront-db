-- Ostfront DB roles (security-p0 #9)
-- Run as Neon project owner after applying Drizzle migrations.
-- Replace <ETL_PASSWORD> and <RO_PASSWORD> with strong secrets.
-- Do NOT grant CREATE to goh_etl. Owner runs migrations only.

-- ---------------------------------------------------------------------------
-- ETL writer (SELECT/INSERT/UPDATE/DELETE on app tables; no CREATE)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goh_etl') THEN
    CREATE ROLE goh_etl WITH LOGIN PASSWORD '<ETL_PASSWORD>';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO goh_etl;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO goh_etl;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO goh_etl;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO goh_etl;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO goh_etl;

-- Explicitly no CREATE
REVOKE CREATE ON SCHEMA public FROM goh_etl;

-- ---------------------------------------------------------------------------
-- App read-only (Vercel DATABASE_URL)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goh_app_ro') THEN
    CREATE ROLE goh_app_ro WITH LOGIN PASSWORD '<RO_PASSWORD>' CONNECTION LIMIT 20;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO goh_app_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO goh_app_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT ON TABLES TO goh_app_ro;

ALTER ROLE goh_app_ro SET default_transaction_read_only = on;
ALTER ROLE goh_app_ro SET statement_timeout = '3s';
ALTER ROLE goh_app_ro SET idle_in_transaction_session_timeout = '10s';

-- Deny drizzle / other schemas if present
REVOKE ALL ON SCHEMA drizzle FROM goh_app_ro;
REVOKE ALL ON SCHEMA drizzle FROM goh_etl;

-- ---------------------------------------------------------------------------
-- Search extensions (owner)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE INDEX IF NOT EXISTS units_search_trgm_idx
  ON units USING gin (search_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS unit_aliases_trgm_idx
  ON unit_aliases USING gin (lower(immutable_unaccent(alias)) gin_trgm_ops);
