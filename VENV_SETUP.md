# FisherP – Local Development with VENV (No Docker, No Sudo)

This guide explains how to run the FisherP Django backend entirely in user space using Python's built-in `venv` module and Redis compiled from source. **No Docker and no sudo privileges are required.**

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [One-Time Setup](#one-time-setup)
3. [Daily Workflow](#daily-workflow)
4. [Helper Scripts](#helper-scripts)
5. [Environment Variables](#environment-variables)
6. [Database](#database)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool     | Minimum Version | Notes |
|----------|-----------------|-------|
| Python   | 3.10+           | Must have `venv` module |
| pip      | 21+             | Bundled with modern Python |
| gcc/make | any             | For compiling Redis from source |
| curl     | any             | For downloading Redis |

Verify your Python version:

```bash
python3 --version
```

---

## One-Time Setup

Run the automated setup script (idempotent – safe to run multiple times):

```bash
cd fish-trading-saas/backend
./scripts/setup-venv.sh
```

### What `setup-venv.sh` does:

1. **Creates `.venv`** inside `fish-trading-saas/backend/` if it doesn't exist
2. **Upgrades pip** to the latest version
3. **Installs all Python dependencies** from `requirements.txt` (Django, DRF, Celery, etc.)
4. **Downloads and compiles Redis** from source into `~/redis-local` if not already present
5. **Makes helper scripts executable**

### Manual setup (if you prefer)

```bash
# 1. Create virtual environment
cd fish-trading-saas/backend
python3 -m venv .venv

# 2. Activate it
source .venv/bin/activate

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Build Redis from source
cd ~
curl -LO https://download.redis.io/redis-stable.tar.gz
tar xzf redis-stable.tar.gz
cd redis-stable
make PREFIX=$HOME/redis-local install
```

---

## Daily Workflow

### Terminal 1 – Django Development Server

```bash
cd fish-trading-saas/backend
./scripts/start-dev.sh
```

This script will:
- Activate `.venv`
- Start Redis (if not already running)
- Run Django migrations
- Collect static files
- Start the Django dev server on **http://localhost:8000**

### Terminal 2 – Celery Worker

```bash
cd fish-trading-saas/backend
./scripts/start-celery.sh
```

### Terminal 3 – Celery Beat (Periodic Tasks)

```bash
cd fish-trading-saas/backend
./scripts/start-celery-beat.sh
```

---

## Helper Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup-venv.sh` | One-time environment setup |
| `scripts/start-dev.sh` | Starts Redis + Django dev server |
| `scripts/start-celery.sh` | Starts Celery worker |
| `scripts/start-celery-beat.sh` | Starts Celery beat scheduler |

All scripts are **self-contained**: they activate `.venv` automatically and export the required environment variables.

---

## Environment Variables

The helper scripts automatically export these variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `DJANGO_SETTINGS_MODULE` | `config.settings` | Django settings path |
| `DEBUG` | `True` | Enable debug mode |
| `SECRET_KEY` | `dev-only-insecure-key-change-in-production` | Django secret (change in production) |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Allowed hosts |
| `DB_NAME` | `fisherp_dev` | Database name |
| `DB_USER` | `fisherp_user` | Database user |
| `DB_PASSWORD` | `fisherp_pass` | Database password |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `CELERY_BROKER_URL` | `redis://localhost:6379/0` | Celery broker |
| `CELERY_RESULT_BACKEND` | `redis://localhost:6379/1` | Celery results |

To override any variable, export it **before** running the script:

```bash
export DEBUG=False
./scripts/start-dev.sh
```

---

## Database

FisherP requires PostgreSQL for development and production. Configure the connection before starting the backend by setting the `DB_*` environment variables.

### PostgreSQL

If you have PostgreSQL running locally:

```bash
export DB_NAME=fisherp_dev
export DB_USER=fisherp_user
export DB_PASSWORD=fisherp_pass
export DB_HOST=localhost
export DB_PORT=5432
./scripts/start-dev.sh
```

If you are using Docker Compose, the default `docker-compose.yml` and `docker-compose.postgres.yml` stacks are already configured to wire the backend to a PostgreSQL service.

---

## Troubleshooting

### "Permission denied" when running scripts

Make scripts executable:

```bash
chmod +x fish-trading-saas/backend/scripts/*.sh
```

### "Virtual environment not found"

Create it manually:

```bash
cd fish-trading-saas/backend
python3 -m venv .venv
```

### Redis fails to start

Check if another Redis instance is already running:

```bash
pgrep -x redis-server
```

If yes, the script will reuse it. If you want to stop it:

```bash
killall redis-server
```

### "ModuleNotFoundError" for Django or Celery

Reinstall dependencies:

```bash
cd fish-trading-saas/backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Port 8000 already in use

Find and kill the process:

```bash
lsof -ti:8000 | xargs kill -9
```

Or use a different port:

```bash
python manage.py runserver 0.0.0.0:8001
```

### Docker-related errors

If you see Docker permission errors, **ignore them**. This setup is designed to work without Docker. Do not run `docker` commands or use `sudo`.

---

## Comparison: Docker vs VENV

| Aspect | Docker Compose | VENV (this guide) |
|--------|---------------|-------------------|
| **Sudo required** | Yes (docker group) | **No** |
| **Startup time** | Slow (image build) | **Fast** |
| **Resource usage** | Higher | **Lower** |
| **Isolation** | Full container | Python venv only |
| **Redis** | Container | **Compiled from source** |
| **Best for** | CI/CD, production parity | **Local development** |

---

## Next Steps

- Open http://localhost:8000 in your browser
- Access the admin panel at http://localhost:8000/admin/
- API documentation (Swagger UI) at http://localhost:8000/api/schema/swagger-ui/

For frontend development, see the frontend README in `fish-trading-saas/frontend/`.
