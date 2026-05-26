#!/bin/bash
# ============================================================
# FisherP — Local Development Startup Script
# ============================================================
# Runs both Django backend and Vite frontend servers.
# Note: node_modules installed in ~/fisherp-frontend-modules 
# because the project USB drive (FAT32) doesn't support symlinks.
# ============================================================

set -e

PROJECT_DIR="/media/odoo/5AAA-AC72/project/fisherp/fish-trading-saas"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
FRONTEND_MODULES="/home/odoo/fisherp-frontend-modules"
NVM_DIR="$HOME/.nvm"

# ── Load nvm ──────────────────────────────────────────────────
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use 20 --silent 2>/dev/null || true
fi

# ── Backend (Django) ──────────────────────────────────────────
echo "🐟 Starting Django backend on http://localhost:8000 ..."
DJANGO_SETTINGS_MODULE=config.settings python3 "$BACKEND_DIR/manage.py" runserver 0.0.0.0:8000 &
BACKEND_PID=$!

sleep 2

# ── Frontend (Vite) ───────────────────────────────────────────
echo "⚡ Starting Vite frontend on http://localhost:5173 ..."
(cd "$FRONTEND_MODULES" && "$FRONTEND_MODULES/node_modules/.bin/vite" \
  --config "$FRONTEND_MODULES/vite.config.js" \
  --host 0.0.0.0 \
  --port 5173) &
FRONTEND_PID=$!

echo ""
echo "============================================================"
echo "✅  FisherP is running!"
echo "   Backend API:   http://localhost:8000"
echo "   Frontend:      http://localhost:5173"
echo "   Health:        http://localhost:8000/health/"
echo "   API Docs:      http://localhost:8000/api/docs/"
echo ""
echo "   Demo Login:"
echo "   Email:    admin@fishapp.com"
echo "   Password: admin123"
echo ""
echo "   Press Ctrl+C to stop both servers"
echo "============================================================"

# Wait for Ctrl+C and cleanup
cleanup() {
  echo ""
  echo "Stopping servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo "Done."
}
trap cleanup SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
