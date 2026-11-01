# VENV Local Dev Setup – TODO Checklist

## Context
User `vscode` cannot run Docker without sudo (not in `docker` group).  
This checklist tracks building a fully functional local dev environment using only user-space tools (`.venv`, Redis built from source, no sudo).

---

## ✅ Step 1: Sync Python dependencies inside `.venv`
**Status:** COMPLETE  
**Command used:**
```bash
cd fish-trading-saas/backend
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```
**Result:** All 116 packages installed successfully (Django 6.0.2, DRF, Celery 5.4.0, etc.).

---

## ✅ Step 2: Install Redis without sudo
**Status:** COMPLETE  
**Command used:**
```bash
cd ~
curl -LO https://download.redis.io/redis-stable.tar.gz
tar xzf redis-stable.tar.gz
cd redis-stable
make PREFIX=$HOME/redis-local install
```
**Result:** Redis 8.6.2 installed to `~/redis-local/bin/redis-server` (no sudo required).

---

## ✅ Step 3: Create convenience startup shell scripts
**Status:** COMPLETE  
**Scripts created:**
- `fish-trading-saas/backend/scripts/start-dev.sh` – Starts Redis + Django dev server
- `fish-trading-saas/backend/scripts/start-celery.sh` – Starts Celery worker
- `fish-trading-saas/backend/scripts/start-celery-beat.sh` – Starts Celery beat scheduler
- `fish-trading-saas/backend/scripts/setup-venv.sh` – One-time setup script

All scripts are executable and self-contained (auto-activate `.venv`, export env vars).

---

## ✅ Step 4: Write `VENV_SETUP.md` guide
**Status:** COMPLETE  
**File:** `VENV_SETUP.md`  
**Contents:** Full guide covering prerequisites, one-time setup, daily workflow, helper scripts, environment variables, database options, and troubleshooting.

---

## ⬜ Step 5: Test the setup end-to-end
**Status:** IN PROGRESS  
**Test plan:**
- Run `./scripts/start-dev.sh` and verify Django starts
- Check `/health/` endpoint responds
- Verify Redis is running and accessible
