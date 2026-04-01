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

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL

    -- ------------------------------------------------------------------
    -- 1. Create application user (idempotent)
    -- ------------------------------------------------------------------
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_USER}') THEN
            CREATE ROLE "${APP_USER}" WITH LOGIN PASSWORD '${APP_PASS}';
            RAISE NOTICE 'Created role: ${APP_USER}';
        ELSE
            ALTER ROLE "${APP_USER}" WITH PASSWORD '${APP_PASS}';
            RAISE NOTICE 'Updated password for existing role: ${APP_USER}';
        END IF;
    END
    \$\$;

    -- ------------------------------------------------------------------
    -- 2. Create application database (idempotent)
    -- ------------------------------------------------------------------
    SELECT 'CREATE DATABASE "${APP_DB}" OWNER "${APP_USER}" ENCODING ''UTF8'' LC_COLLATE ''en_US.UTF-8'' LC_CTYPE ''en_US.UTF-8'' TEMPLATE template0'
    WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${APP_DB}')\gexec

    -- ------------------------------------------------------------------
    -- 3. Grant privileges
    -- ------------------------------------------------------------------
    GRANT ALL PRIVILEGES ON DATABASE "${APP_DB}" TO "${APP_USER}";

EOSQL

# Connect to the application database to enable extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DB" <<-EOSQL

    -- ------------------------------------------------------------------
    -- 4. Enable extensions
    -- ------------------------------------------------------------------
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";

    -- ------------------------------------------------------------------
    -- 5. Schema ownership
    -- ------------------------------------------------------------------
    ALTER SCHEMA public OWNER TO "${APP_USER}";
    GRANT ALL ON SCHEMA public TO "${APP_USER}";

EOSQL

echo "[postgres-init] Initialization complete."
