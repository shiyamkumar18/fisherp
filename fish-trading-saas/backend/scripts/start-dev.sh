#!/bin/bash
# =============================================================================
# FisherP – Local Dev Server Starter (venv mode, no Docker)
# =============================================================================
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
REDIS_BIN="$HOME/redis-local/bin"
POSTGRES_BIN="$HOME/postgres-local/usr/lib/postgresql/15/bin"
POSTGRES_DATA="$HOME/postgres-data"
POSTGRES_RUN="$HOME/postgres-run"

echo -e "${GREEN}[start-dev] Starting FisherP local development environment...${NC}"

# ---------------------------------------------------------------------------
# 1. Activate virtual environment
# ---------------------------------------------------------------------------
if [ ! -f "$BACKEND_DIR/.venv/bin/activate" ]; then
    echo -e "${RED}[start-dev] ERROR: Virtual environment not found at $BACKEND_DIR/.venv${NC}"
    echo "Run: cd $BACKEND_DIR && python -m venv .venv"
    exit 1
fi

source "$BACKEND_DIR/.venv/bin/activate"
echo -e "${GREEN}[start-dev] Virtual environment activated.${NC}"

# ---------------------------------------------------------------------------
# 2. Start Redis (if not already running)
# ---------------------------------------------------------------------------
if ! pgrep -x "redis-server" > /dev/null; then
    echo -e "${YELLOW}[start-dev] Starting Redis server...${NC}"
    mkdir -p "$BACKEND_DIR/logs"
    nohup "$REDIS_BIN/redis-server" --daemonize yes \
        --logfile "$BACKEND_DIR/logs/redis.log" \
        --dir "$BACKEND_DIR" \
        --dbfilename redis_dump.rdb \
        --port 6379 > /dev/null 2>&1
    sleep 1
    if pgrep -x "redis-server" > /dev/null; then
        echo -e "${GREEN}[start-dev] Redis started on port 6379.${NC}"
    else
        echo -e "${RED}[start-dev] ERROR: Failed to start Redis.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[start-dev] Redis is already running.${NC}"
fi

# ---------------------------------------------------------------------------
# 2b. Start PostgreSQL (if not already running)
# ---------------------------------------------------------------------------
if [ ! -d "$POSTGRES_DATA" ]; then
    echo -e "${YELLOW}[start-dev] Initializing PostgreSQL database cluster...${NC}"
    mkdir -p "$POSTGRES_RUN"
    "$POSTGRES_BIN/initdb" -D "$POSTGRES_DATA" --auth=trust --no-locale --encoding=UTF8
    echo "unix_socket_directories = '$POSTGRES_RUN'" >> "$POSTGRES_DATA/postgresql.conf"
fi

if ! "$POSTGRES_BIN/pg_isready" -h "$POSTGRES_RUN" > /dev/null 2>&1; then
    echo -e "${YELLOW}[start-dev] Starting PostgreSQL server...${NC}"
    "$POSTGRES_BIN/pg_ctl" -D "$POSTGRES_DATA" -l "$POSTGRES_DATA/logfile" start
    sleep 2
    if "$POSTGRES_BIN/pg_isready" -h "$POSTGRES_RUN" > /dev/null 2>&1; then
        echo -e "${GREEN}[start-dev] PostgreSQL started and accepting connections.${NC}"
    else
        echo -e "${RED}[start-dev] ERROR: Failed to start PostgreSQL.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[start-dev] PostgreSQL is already running.${NC}"
fi

# Ensure database user exists
if ! "$POSTGRES_BIN/psql" -h "$POSTGRES_RUN" -U "$(whoami)" -tc "SELECT 1 FROM pg_roles WHERE rolname='fisherp_user'" 2>/dev/null | grep -q 1; then
    echo -e "${YELLOW}[start-dev] Creating PostgreSQL user fisherp_user...${NC}"
    "$POSTGRES_BIN/createuser" -h "$POSTGRES_RUN" -s fisherp_user
fi

# Ensure database exists
if ! "$POSTGRES_BIN/psql" -h "$POSTGRES_RUN" -U "$(whoami)" -tc "SELECT 1 FROM pg_database WHERE datname='fisherp_dev'" 2>/dev/null | grep -q 1; then
    echo -e "${YELLOW}[start-dev] Creating PostgreSQL database fisherp_dev...${NC}"
    "$POSTGRES_BIN/createdb" -h "$POSTGRES_RUN" -O fisherp_user fisherp_dev
fi

# ---------------------------------------------------------------------------
# 3. Export environment variables for local dev
# ---------------------------------------------------------------------------
export PATH="$POSTGRES_BIN:$PATH"
export LD_LIBRARY_PATH="$HOME/postgres-local/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
export DJANGO_SETTINGS_MODULE=config.settings
export DEBUG=True
export SECRET_KEY="dev-only-insecure-key-change-in-production"
export ALLOWED_HOSTS="localhost,127.0.0.1"
export DB_NAME="fisherp_dev"
export DB_USER="fisherp_user"
export DB_PASSWORD="fisherp_pass"
export DB_HOST="localhost"
export DB_PORT="5432"
export REDIS_URL="redis://localhost:6379/0"
export CELERY_BROKER_URL="redis://localhost:6379/0"
export CELERY_RESULT_BACKEND="redis://localhost:6379/1"

# ---------------------------------------------------------------------------
# 4. Run Django migrations
# ---------------------------------------------------------------------------
echo -e "${YELLOW}[start-dev] Running Django migrations...${NC}"
cd "$BACKEND_DIR"
python manage.py migrate --noinput

# ---------------------------------------------------------------------------
# 5. Collect static files
# ---------------------------------------------------------------------------
echo -e "${YELLOW}[start-dev] Collecting static files...${NC}"
python manage.py collectstatic --noinput

# ---------------------------------------------------------------------------
# 6. Start Django development server
# ---------------------------------------------------------------------------
echo -e "${GREEN}[start-dev] Starting Django development server on http://localhost:8000${NC}"
echo -e "${YELLOW}[start-dev] Press Ctrl+C to stop.${NC}"
echo ""

python manage.py runserver 0.0.0.0:8000
