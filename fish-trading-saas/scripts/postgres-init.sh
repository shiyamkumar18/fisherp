#!/bin/bash
# =============================================================================
# FisherP – PostgreSQL Initialization Script
# Executed automatically by the postgres:15 Docker image on first start
# (any *.sh placed in /docker-entrypoint-initdb.d/ is run as the postgres user).
#
# This script creates the application database and user if they do not
# already exist, grants required privileges, and enables extensions.
# All sensitive values are read from environment variables provided by
# Docker Compose / the container runtime.
# =============================================================================
set -euo pipefail

# Environment variables are injected by Docker Compose:
#   POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD  (set on the postgres service)
APP_DB="${DB_NAME:-${POSTGRES_DB:-fisherp_prod}}"
APP_USER="${DB_USER:-${POSTGRES_USER:-fisherp_user}}"
APP_PASS="${DB_PASSWORD:-${POSTGRES_PASSWORD:-CHANGE_ME}}"

echo "[postgres-init] Initializing database '$APP_DB' for user '$APP_USER'..."

# Use psql -v to pass values as named variables, then reference them via
# :'varname' (quoted literal) or :"varname" (quoted identifier) in the SQL.
# The format() function with %I/%L handles identifier/literal escaping safely,
# preventing SQL injection even when values contain single quotes or special chars.
psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname   "$POSTGRES_DB"   \
     -v app_user="$APP_USER"     \
     -v app_pass="$APP_PASS"     \
     -v app_db="$APP_DB"         \
     <<-'EOSQL'

    -- ------------------------------------------------------------------
    -- 1. Create application user (idempotent)
    -- Use format(%I/%L) to safely handle special chars in name/password.
    -- ------------------------------------------------------------------
    DO $$
    DECLARE
        v_user TEXT := :'app_user';
        v_pass TEXT := :'app_pass';
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_user) THEN
            EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', v_user, v_pass);
            RAISE NOTICE 'Created role: %', v_user;
        ELSE
            EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', v_user, v_pass);
            RAISE NOTICE 'Updated password for existing role: %', v_user;
        END IF;
    END
    $$;

    -- ------------------------------------------------------------------
    -- 2. Create application database (idempotent)
    -- ------------------------------------------------------------------
    DO $$
    DECLARE
        v_db   TEXT := :'app_db';
        v_user TEXT := :'app_user';
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = v_db) THEN
            EXECUTE format(
                'CREATE DATABASE %I OWNER %I ENCODING ''UTF8'' '
                'LC_COLLATE ''en_US.UTF-8'' LC_CTYPE ''en_US.UTF-8'' TEMPLATE template0',
                v_db, v_user
            );
            RAISE NOTICE 'Created database: %', v_db;
        END IF;
    END
    $$;

    -- ------------------------------------------------------------------
    -- 3. Grant privileges
    -- ------------------------------------------------------------------
    DO $$
    DECLARE
        v_db   TEXT := :'app_db';
        v_user TEXT := :'app_user';
    BEGIN
        EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', v_db, v_user);
    END
    $$;

EOSQL

# Connect to the application database to enable extensions
psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname   "$APP_DB"        \
     -v app_user="$APP_USER"     \
     <<-'EOSQL'

    -- ------------------------------------------------------------------
    -- 4. Enable extensions
    -- ------------------------------------------------------------------
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";

    -- ------------------------------------------------------------------
    -- 5. Schema ownership
    -- ------------------------------------------------------------------
    DO $$
    DECLARE
        v_user TEXT := :'app_user';
    BEGIN
        EXECUTE format('ALTER SCHEMA public OWNER TO %I', v_user);
        EXECUTE format('GRANT ALL ON SCHEMA public TO %I', v_user);
    END
    $$;

EOSQL

echo "[postgres-init] Initialization complete."
