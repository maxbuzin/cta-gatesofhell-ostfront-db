-- Ostfront DB roles (security-p0 #9)
-- Run as Neon project owner (neondb_owner) AFTER migrations 0000 + 0001 + 0002.
-- Create roles without passwords here. Then set passwords interactively:
--   \password goh_etl
--   \password goh_app_ro
-- Do NOT grant CREATE to goh_etl. Owner runs migrations only.

-- ---------------------------------------------------------------------------
-- Harden PUBLIC (no CREATE / TEMP)
-- ---------------------------------------------------------------------------
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON DATABASE CURRENT_DATABASE FROM PUBLIC;
REVOKE TEMP ON DATABASE CURRENT_DATABASE FROM PUBLIC;

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

ALTER ROLE goh_etl CONNECTION LIMIT 10;
ALTER ROLE goh_etl SET statement_timeout = '30s';

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

-- ---------------------------------------------------------------------------
-- Verify (run after \password; expect no neon_superuser membership)
-- ---------------------------------------------------------------------------
-- SELECT rolname, rolsuper, rolcanlogin, rolconnlimit
-- FROM pg_roles WHERE rolname IN ('goh_etl', 'goh_app_ro');
--
-- SELECT r.rolname AS member, m.rolname AS role
-- FROM pg_auth_members am
-- JOIN pg_roles r ON r.oid = am.member
-- JOIN pg_roles m ON m.oid = am.roleid
-- WHERE r.rolname IN ('goh_etl', 'goh_app_ro');
-- -- Expect zero rows mentioning neon_superuser.
--
-- SELECT has_schema_privilege('goh_etl', 'public', 'CREATE') AS etl_can_create;  -- false
-- SELECT has_database_privilege('PUBLIC', current_database(), 'CREATE') AS public_db_create; -- false
-- SELECT has_database_privilege('PUBLIC', current_database(), 'TEMP') AS public_temp; -- false
--
-- SET ROLE goh_app_ro;
-- SELECT current_user;  -- goh_app_ro
-- SELECT * FROM units LIMIT 1;  -- ok
-- RESET ROLE;
