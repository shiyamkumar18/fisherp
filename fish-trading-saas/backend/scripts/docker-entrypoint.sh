#!/bin/sh
# =============================================================================
# FisherP – Docker Entrypoint Script
# Runs inside the Django/Gunicorn container on every startup.
# =============================================================================
set -e

# ---------------------------------------------------------------------------
# Wait for PostgreSQL to be ready (if DB_HOST is set)
# ---------------------------------------------------------------------------
if [ -n "$DB_HOST" ]; then
    echo "[entrypoint] Waiting for PostgreSQL at $DB_HOST:${DB_PORT:-5432}..."
    until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -q; do
        echo "[entrypoint] PostgreSQL not ready – retrying in 2 s..."
        sleep 2
    done
    echo "[entrypoint] PostgreSQL is ready."
fi

# ---------------------------------------------------------------------------
# Wait for Redis to be ready (if REDIS_URL is set)
# Use redis-cli -u to avoid fragile URL parsing (handles missing port safely).
# ---------------------------------------------------------------------------
if [ -n "$REDIS_URL" ]; then
    echo "[entrypoint] Waiting for Redis at $REDIS_URL..."
    until redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; do
        echo "[entrypoint] Redis not ready – retrying in 2 s..."
        sleep 2
    done
    echo "[entrypoint] Redis is ready."
fi

# ---------------------------------------------------------------------------
# Run database migrations and collect static files.
# Gated to the "web" role to prevent race conditions in multi-replica and
# multi-service setups (celery/celery-beat share the same image).
# ---------------------------------------------------------------------------
if [ "${APP_ROLE:-web}" = "web" ]; then
    echo "[entrypoint] Running database migrations..."
    python manage.py migrate --noinput

    echo "[entrypoint] Collecting static files..."
    python manage.py collectstatic --noinput
fi

# ---------------------------------------------------------------------------
# Create default superuser from environment variables (first deploy only)
# ---------------------------------------------------------------------------
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "[entrypoint] Creating superuser '$DJANGO_SUPERUSER_USERNAME' (if not already present)..."
    python manage.py createsuperuser \
        --noinput \
        --username "$DJANGO_SUPERUSER_USERNAME" \
        --email    "$DJANGO_SUPERUSER_EMAIL" \
        2>/dev/null || echo "[entrypoint] Superuser already exists – skipping."
fi

# ---------------------------------------------------------------------------
# Hand off to CMD (Gunicorn, Celery worker, etc.)
# ---------------------------------------------------------------------------
echo "[entrypoint] Starting: $*"
exec "$@"
