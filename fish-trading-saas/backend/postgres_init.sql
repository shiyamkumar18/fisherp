-- postgres_init.sql
-- ---------------------------------------------------------------------------
-- FisherP production PostgreSQL initialisation script.
-- Run automatically by the Docker postgres:15 entrypoint on first start,
-- or manually via:  psql -U postgres -f postgres_init.sql
--
-- This script:
--   1. Creates the application database and user (idempotent).
--   2. Grants minimal required privileges.
--   3. Enables required extensions.
--   4. Applies performance and audit settings.
--   5. Creates a read-only replica role for reporting queries.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Database & user creation (safe to re-run)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fisherp_user') THEN
        -- ⚠️  REPLACE 'CHANGE_ME_IN_ENV' with a strong password before running in production.
        -- Recommended: generate with `openssl rand -base64 32`
        CREATE ROLE fisherp_user WITH LOGIN PASSWORD 'CHANGE_ME_IN_ENV';
        RAISE NOTICE 'Created role fisherp_user';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'fisherp_prod') THEN
        -- Cannot run CREATE DATABASE inside a transaction block; handled by
        -- the Docker entrypoint POSTGRES_DB env variable instead.
        RAISE NOTICE 'Database fisherp_prod should already exist (created by Docker entrypoint)';
    END IF;
END $$;

-- Grant connect privilege
GRANT CONNECT ON DATABASE fisherp_prod TO fisherp_user;

-- ---------------------------------------------------------------------------
-- 2. Schema & privileges
-- ---------------------------------------------------------------------------

-- All subsequent statements operate on fisherp_prod
\connect fisherp_prod

CREATE SCHEMA IF NOT EXISTS public;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO fisherp_user;

-- Allow the app user to create/alter/drop objects in the public schema
GRANT CREATE ON SCHEMA public TO fisherp_user;

-- Grant on existing tables (and future tables via ALTER DEFAULT PRIVILEGES)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fisherp_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fisherp_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fisherp_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO fisherp_user;

-- ---------------------------------------------------------------------------
-- 3. Read-only reporting role
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fisherp_readonly') THEN
        -- ⚠️  REPLACE 'CHANGE_ME_READONLY' with a strong password before running in production.
        CREATE ROLE fisherp_readonly WITH LOGIN PASSWORD 'CHANGE_ME_READONLY';
        RAISE NOTICE 'Created role fisherp_readonly';
    END IF;
END $$;

GRANT CONNECT ON DATABASE fisherp_prod TO fisherp_readonly;
GRANT USAGE ON SCHEMA public TO fisherp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO fisherp_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO fisherp_readonly;

-- ---------------------------------------------------------------------------
-- 4. Required PostgreSQL extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- Query performance analysis
CREATE EXTENSION IF NOT EXISTS pgcrypto;             -- Encryption helpers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";          -- UUID generation

-- ---------------------------------------------------------------------------
-- 5. Performance & audit configuration (session-level hints)
-- ---------------------------------------------------------------------------

-- These settings are applied server-wide via postgresql.conf or the Docker
-- command override in docker-compose-postgres.yml.  Documented here for
-- reference / manual deployments.

-- Recommended postgresql.conf settings (do NOT paste into this file):
--
--   max_connections            = 200
--   shared_buffers             = 256MB
--   effective_cache_size       = 768MB
--   maintenance_work_mem       = 64MB
--   checkpoint_completion_target = 0.9
--   wal_buffers                = 16MB
--   default_statistics_target  = 100
--   random_page_cost           = 1.1
--   effective_io_concurrency   = 200
--   log_min_duration_statement = 1000   -- log queries taking > 1 s
--   log_line_prefix            = '%t [%p]: [%l-1] user=%u,db=%d,app=%a '
--   log_checkpoints            = on
--   log_connections            = on
--   log_disconnections         = on
--   log_lock_waits             = on
--   deadlock_timeout           = 1s
--   track_activities           = on
--   track_counts               = on
--   pg_stat_statements.track   = all

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
DO $$ BEGIN RAISE NOTICE 'FisherP PostgreSQL initialisation complete.'; END $$;
