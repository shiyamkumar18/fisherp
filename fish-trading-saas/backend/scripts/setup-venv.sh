#!/bin/bash
# =============================================================================
# FisherP – One-Time VENV Setup (no Docker, no sudo)
# =============================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
REDIS_LOCAL="$HOME/redis-local"

echo -e "${GREEN}[setup] FisherP one-time venv setup starting...${NC}"

# ---------------------------------------------------------------------------
# 1. Check Python version
# ---------------------------------------------------------------------------
PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "not found")
if [ "$PYTHON_VERSION" = "not found" ]; then
    echo -e "${RED}[setup] ERROR: python3 is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}[setup] Found: $PYTHON_VERSION${NC}"

# ---------------------------------------------------------------------------
# 2. Create virtual environment
# ---------------------------------------------------------------------------
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${YELLOW}[setup] Creating Python virtual environment...${NC}"
    cd "$BACKEND_DIR"
    python3 -m venv .venv
    echo -e "${GREEN}[setup] Virtual environment created at $BACKEND_DIR/.venv${NC}"
else
    echo -e "${GREEN}[setup] Virtual environment already exists.${NC}"
fi

# ---------------------------------------------------------------------------
# 3. Activate and upgrade pip
# ---------------------------------------------------------------------------
source "$BACKEND_DIR/.venv/bin/activate"
echo -e "${YELLOW}[setup] Upgrading pip...${NC}"
pip install --upgrade pip

# ---------------------------------------------------------------------------
# 4. Install Python dependencies
# ---------------------------------------------------------------------------
echo -e "${YELLOW}[setup] Installing Python dependencies (this may take a few minutes)...${NC}"
cd "$BACKEND_DIR"
pip install -r requirements.txt
echo -e "${GREEN}[setup] Python dependencies installed successfully.${NC}"

# ---------------------------------------------------------------------------
# 5. Install Redis from source (if not already installed)
# ---------------------------------------------------------------------------
if [ ! -f "$REDIS_LOCAL/bin/redis-server" ]; then
    echo -e "${YELLOW}[setup] Redis not found. Building from source...${NC}"
    cd ~
    if [ ! -d "redis-stable" ]; then
        echo -e "${YELLOW}[setup] Downloading Redis source...${NC}"
        curl -LO https://download.redis.io/redis-stable.tar.gz
        tar xzf redis-stable.tar.gz
    fi
    cd redis-stable
    echo -e "${YELLOW}[setup] Compiling Redis (this may take a few minutes)...${NC}"
    make PREFIX=$HOME/redis-local install
    echo -e "${GREEN}[setup] Redis installed to $REDIS_LOCAL/bin/redis-server${NC}"
else
    echo -e "${GREEN}[setup] Redis already installed at $REDIS_LOCAL/bin/redis-server${NC}"
fi

# ---------------------------------------------------------------------------
# 6. Make helper scripts executable
# ---------------------------------------------------------------------------
echo -e "${YELLOW}[setup] Making helper scripts executable...${NC}"
chmod +x "$BACKEND_DIR/scripts/start-dev.sh"
chmod +x "$BACKEND_DIR/scripts/start-celery.sh"
chmod +x "$BACKEND_DIR/scripts/start-celery-beat.sh"
chmod +x "$BACKEND_DIR/scripts/setup-venv.sh"

# ---------------------------------------------------------------------------
# 7. Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup complete! No sudo required.     ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the dev server:  ./scripts/start-dev.sh"
echo "  2. Start Celery worker:   ./scripts/start-celery.sh"
echo "  3. Start Celery beat:     ./scripts/start-celery-beat.sh"
echo ""
echo "Redis binary location: $REDIS_LOCAL/bin/redis-server"
echo "Virtual environment:   $BACKEND_DIR/.venv"
echo ""
