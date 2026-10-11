-- Ostfront DB roles (security-p0 #9)
-- Run as Neon project owner (neondb_owner) AFTER `pnpm db:migrate` (Max machine + DATABASE_URL_OWNER).
-- Create roles without passwords here. Then set passwords interactively:
--   \password goh_etl
--   \password goh_app_ro
-- Do NOT grant CREATE to goh_etl. Owner runs migrations only.

-- ---------------------------------------------------------------------------
-- Harden PUBLIC
-- ---------------------------------------------------------------------------
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

DO $$
BEGIN
  EXECUTE format(
    'REVOKE ALL ON DATABASE %I FROM PUBLIC',
    current_database()
  );
  EXECUTE format(
    'REVOKE TEMP ON DATABASE %I FROM PUBLIC',
    current_database()
  );
END
$$;

-- ---------------------------------------------------------------------------
-- ETL writer (SELECT/INSERT/UPDATE/DELETE on app tables; no CREATE)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goh_etl') THEN
    CREATE ROLE goh_etl WITH LOGIN;
  END IF;
END
$$;

ALTER ROLE goh_etl CONNECTION LIMIT 5;
ALTER ROLE goh_etl SET statement_timeout = '60s';
ALTER ROLE goh_etl SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE goh_etl SET search_path = public;
ALTER ROLE goh_etl SET lock_timeout = '1s';

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO goh_etl',
    current_database()
  );
END
$$;

GRANT USAGE ON SCHEMA public TO goh_etl;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO goh_etl;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO goh_etl;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO goh_etl;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO goh_etl;

REVOKE CREATE ON SCHEMA public FROM goh_etl;

-- ---------------------------------------------------------------------------
-- App read-only (Vercel DATABASE_URL, pooled)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goh_app_ro') THEN
    CREATE ROLE goh_app_ro WITH LOGIN;
  END IF;
END
$$;

ALTER ROLE goh_app_ro CONNECTION LIMIT 20;
ALTER ROLE goh_app_ro SET default_transaction_read_only = on;
ALTER ROLE goh_app_ro SET statement_timeout = '3s';
ALTER ROLE goh_app_ro SET idle_in_transaction_session_timeout = '10s';
ALTER ROLE goh_app_ro SET search_path = public;
ALTER ROLE goh_app_ro SET lock_timeout = '1s';

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO goh_app_ro',
    current_database()
  );
END
$$;

GRANT USAGE ON SCHEMA public TO goh_app_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO goh_app_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO goh_app_ro;

-- Deny drizzle schema if present (guarded)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA drizzle FROM goh_app_ro';
    EXECUTE 'REVOKE ALL ON SCHEMA drizzle FROM goh_etl';
  END IF;
END
$$;

-- Assert app roles are not neon_superuser members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'neon_superuser') THEN
    IF pg_has_role('goh_etl', 'neon_superuser', 'member') THEN
      RAISE EXCEPTION 'goh_etl must not be a member of neon_superuser';
    END IF;
    IF pg_has_role('goh_app_ro', 'neon_superuser', 'member') THEN
      RAISE EXCEPTION 'goh_app_ro must not be a member of neon_superuser';
    END IF;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Verify (run after \password)
-- ---------------------------------------------------------------------------
-- SELECT rolname, rolsuper, rolcanlogin, rolconnlimit
-- FROM pg_roles WHERE rolname IN ('goh_etl', 'goh_app_ro');
--
-- SELECT pg_has_role('goh_etl', 'neon_superuser', 'member');   -- false
-- SELECT pg_has_role('goh_app_ro', 'neon_superuser', 'member'); -- false
-- SELECT has_schema_privilege('goh_etl', 'public', 'CREATE');  -- false
-- SELECT has_database_privilege('PUBLIC', current_database(), 'CONNECT'); -- typically false after REVOKE ALL
--
-- SET ROLE goh_app_ro;
-- SELECT current_user;
-- SELECT * FROM units LIMIT 1;  -- ok
-- INSERT INTO factions (slug, name_en) VALUES ('x','x');  -- must fail
-- RESET ROLE;
