#!/bin/bash
# ============================================================
# FisherP — Production-Level Development Startup Script
# ============================================================
# Architecture:
#   PostgreSQL  → Unix socket  /home/odoo/.cache/pg_run/.s.PGSQL.5432
#   Gunicorn    → Unix socket  /home/odoo/.cache/django.sock
#   Vite        → TCP port     http://localhost:5173
#
# This design works around the container environment that blocks
# inter-process TCP loopback connections.
# ============================================================

set -euo pipefail

# ── Paths ────────────────────────────────────────────────────
PROJECT_DIR="/media/odoo/5AAA-AC72/project/fisherp/fish-trading-saas"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_MODULES="/home/odoo/fisherp-frontend-modules"
BACKEND_VENV="/home/odoo/.cache/fisherp-backend-venv"
PG_DATA="/home/odoo/.cache/postgres_dev_data"
PG_SOCK_DIR="/home/odoo/.cache/pg_run"
PG_BIN="/usr/lib/postgresql/17/bin"
DJANGO_SOCK="/home/odoo/.cache/django.sock"
PG_LOG="$PG_DATA/db_server.log"
GUNICORN_LOG="/home/odoo/.cache/gunicorn.log"

BACKEND_PID=""
FRONTEND_PID=""
PG_MANAGED=false  # true if we started postgres in this session

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── Cleanup ───────────────────────────────────────────────────
cleanup() {
  echo ""
  info "Shutting down FisherP servers..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && info "Vite stopped."
  [ -n "$BACKEND_PID"  ] && kill "$BACKEND_PID"  2>/dev/null && info "Gunicorn stopped."
  if $PG_MANAGED; then
    "$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast -s 2>/dev/null && info "PostgreSQL stopped." || true
  fi
  rm -f "$DJANGO_SOCK"
  success "All services stopped. Goodbye."
}
trap cleanup SIGINT SIGTERM EXIT

# ══════════════════════════════════════════════════════════════
# STEP 1 — PostgreSQL
# ══════════════════════════════════════════════════════════════
start_postgres() {
  info "Checking PostgreSQL..."
  mkdir -p "$PG_SOCK_DIR"

  # Test if already running via socket
  if psql -h "$PG_SOCK_DIR" -p 5432 -U odoo -d postgres -c "SELECT 1;" &>/dev/null 2>&1; then
    success "PostgreSQL already running (socket: $PG_SOCK_DIR)"
    return 0
  fi

  # Clean stale lock files
  rm -f \
    "$PG_DATA/postmaster.pid" \
    "$PG_SOCK_DIR/.s.PGSQL.5432" \
    "$PG_SOCK_DIR/.s.PGSQL.5432.lock"

  info "Starting PostgreSQL 17 (socket: $PG_SOCK_DIR)..."

  # Must use setsid + disown so the process survives the shell subprocess
  setsid "$PG_BIN/postgres" \
    -D "$PG_DATA" \
    -p 5432 \
    -k "$PG_SOCK_DIR" \
    -h "" \
    >> "$PG_LOG" 2>&1 &
  disown $!
  PG_MANAGED=true

  # Wait up to 15s for postgres to be ready
  local attempts=0
  while [ $attempts -lt 15 ]; do
    sleep 1
    attempts=$((attempts + 1))
    if psql -h "$PG_SOCK_DIR" -p 5432 -U odoo -d postgres -c "SELECT 1;" &>/dev/null 2>&1; then
      success "PostgreSQL ready (${attempts}s)"
      return 0
    fi
  done

  error "PostgreSQL did not start in 15 seconds. Check: $PG_LOG"
  exit 1
}

ensure_db() {
  info "Ensuring database user and schema..."
  psql -h "$PG_SOCK_DIR" -p 5432 -U odoo -d postgres -q <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fisherp_user') THEN
    CREATE USER fisherp_user WITH PASSWORD 'fisherp_pass' CREATEDB SUPERUSER;
  ELSE
    ALTER USER fisherp_user WITH SUPERUSER;
  END IF;
END $$;
SELECT 'CREATE DATABASE fisherp_dev OWNER fisherp_user'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fisherp_dev') \gexec
GRANT ALL PRIVILEGES ON DATABASE fisherp_dev TO fisherp_user;
SQL
  success "Database 'fisherp_dev' ready."
}

# ══════════════════════════════════════════════════════════════
# STEP 2 — Django / Gunicorn
# ══════════════════════════════════════════════════════════════
start_backend() {
  info "Setting up Django backend..."

  if [ ! -f "$BACKEND_VENV/bin/activate" ]; then
    error "Virtual environment missing at $BACKEND_VENV"
    error "Run the setup script first, or check the previous session."
    exit 1
  fi

  source "$BACKEND_VENV/bin/activate"
  cd "$BACKEND_DIR"

  info "Running Django migrations..."
  python3 manage.py migrate --run-syncdb -v 0

  info "Seeding demo data if needed..."
  python3 - <<'PYEOF'
import django, os, enum, datetime
if not hasattr(enum, 'EnumType'): enum.EnumType = type(enum.Enum)
if not hasattr(enum, 'StrEnum'): 
    class StrEnum(str, enum.Enum): pass
    enum.StrEnum = StrEnum
if not hasattr(enum, 'property'): enum.property = property
if not hasattr(enum, 'nonmember'):
    class nonmember:
        def __init__(self, value): self.value = value
        def __get__(self, instance, owner): return self.value
    enum.nonmember = nonmember
if not hasattr(datetime, 'UTC'): datetime.UTC = datetime.timezone.utc
os.environ["DB_NAME"] = "fisherp_dev"
os.environ["DB_USER"] = "odoo"
os.environ["DB_PASSWORD"] = ""
os.environ["DB_HOST"] = "/home/odoo/.cache/pg_run"
os.environ["DB_PORT"] = "5432"
os.environ["SECRET_KEY"] = "dev-secret-key-do-not-use-in-production"
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1"
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["DEBUG"] = "True"
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email="admin@fishapp.com").exists():
    from django.core.management import call_command
    call_command("seed_demo_data", verbosity=0)
    print("  Demo data seeded.")
else:
    # Ensure password is correct
    u = User.objects.get(email="admin@fishapp.com")
    u.set_password("admin123")
    u.is_active = True
    u.save()
PYEOF

  # Remove stale socket
  rm -f "$DJANGO_SOCK"

  info "Starting Gunicorn (unix:$DJANGO_SOCK)..."
  "$BACKEND_VENV/bin/python" -m gunicorn \
    --bind "unix:$DJANGO_SOCK" \
    --workers 3 \
    --threads 2 \
    --worker-class sync \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile "$GUNICORN_LOG" \
    --error-logfile - \
    --log-level info \
    --capture-output \
    config.wsgi:application &
  BACKEND_PID=$!

  # Wait for socket to appear
  local attempts=0
  while [ $attempts -lt 20 ]; do
    sleep 0.5
    attempts=$((attempts + 1))
    if [ -S "$DJANGO_SOCK" ]; then
      success "Gunicorn ready (PID: $BACKEND_PID, ${attempts} attempts)"
      return 0
    fi
  done

  error "Gunicorn did not create socket in 10s. Check logs."
  exit 1
}

# ══════════════════════════════════════════════════════════════
# STEP 3 — Vite frontend
# ══════════════════════════════════════════════════════════════
start_frontend() {
  info "Starting Vite frontend..."

  local VITE_WS="/tmp/vite-workspace"

  # Set up a writable workspace in /tmp so we can symlink node_modules.
  # The project filesystem (/media/...) and FRONTEND_MODULES are read-only or
  # don't permit symlinks, but /tmp always does.
  mkdir -p "$VITE_WS"

  # Symlink node_modules into workspace (safe — /tmp allows symlinks)
  if [ ! -L "$VITE_WS/node_modules" ]; then
    ln -sf "$FRONTEND_MODULES/node_modules" "$VITE_WS/node_modules"
  fi

  # Copy the vite and postcss configs into the writable workspace
  cp "$PROJECT_DIR/frontend/vite.config.js" "$VITE_WS/vite.config.js"
  if [ -f "$PROJECT_DIR/frontend/postcss.config.js" ]; then
    cp "$PROJECT_DIR/frontend/postcss.config.js" "$VITE_WS/postcss.config.js"
  fi

  cd "$VITE_WS"

  # Run Vite with --root pointing at the project source
  # node_modules is co-located in VITE_WS so all bare imports resolve
  NODE_PATH="$FRONTEND_MODULES/node_modules" \
  VITE_ROOT="$PROJECT_DIR/frontend" \
  "$FRONTEND_MODULES/node_modules/.bin/vite" \
    --host 0.0.0.0 \
    --port 5173 \
    --config "$VITE_WS/vite.config.js" &
  FRONTEND_PID=$!

  # Wait up to 10s for Vite process to stay alive
  local attempts=0
  while [ $attempts -lt 20 ]; do
    sleep 0.5
    attempts=$((attempts + 1))
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
      success "Vite ready (PID: $FRONTEND_PID, ${attempts} attempts)"
      return 0
    fi
  done
  error "Vite process died during startup. Check logs."
}

# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║  🐟  FisherP Dev Environment       ║${NC}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

start_postgres
ensure_db
start_backend
start_frontend

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║  ✅  FisherP is running!                       ║${NC}"
echo -e "${BOLD}${GREEN}╠════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Frontend:  http://localhost:5173              ║${NC}"
echo -e "${GREEN}║  API Docs:  (via unix socket proxy)            ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Login Credentials:                            ║${NC}"
echo -e "${GREEN}║    Email:    admin@fishapp.com                 ║${NC}"
echo -e "${GREEN}║    Password: admin123                          ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Other Roles:                                  ║${NC}"
echo -e "${GREEN}║    accountant@fishapp.com / accountant123      ║${NC}"
echo -e "${GREEN}║    trader@fishapp.com     / trader123          ║${NC}"
echo -e "${GREEN}║    store@fishapp.com      / store123           ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all services             ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Keep running — wait for the background processes
wait $BACKEND_PID $FRONTEND_PID
