#!/bin/bash
# =============================================================================
# FisherP – Celery Beat Scheduler Starter (venv mode, no Docker)
# =============================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}[start-celery-beat] Starting Celery beat scheduler...${NC}"

# Activate virtual environment
if [ ! -f "$BACKEND_DIR/.venv/bin/activate" ]; then
    echo -e "${RED}[start-celery-beat] ERROR: Virtual environment not found.${NC}"
    exit 1
fi

source "$BACKEND_DIR/.venv/bin/activate"

# Export environment variables
export DJANGO_SETTINGS_MODULE=config.settings
export DEBUG=True
export SECRET_KEY="dev-only-insecure-key-change-in-production"
export REDIS_URL="redis://localhost:6379/0"
export CELERY_BROKER_URL="redis://localhost:6379/0"
export CELERY_RESULT_BACKEND="redis://localhost:6379/1"

# Check Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo -e "${RED}[start-celery-beat] ERROR: Redis is not running. Start it first with start-dev.sh${NC}"
    exit 1
fi

cd "$BACKEND_DIR"
echo -e "${GREEN}[start-celery-beat] Celery beat scheduler starting...${NC}"
echo -e "${YELLOW}[start-celery-beat] Press Ctrl+C to stop.${NC}"

celery -A trading.celery:app beat --loglevel=info
