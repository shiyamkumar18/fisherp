# FisherP – How to Run the Server Manually

## Quick Start (Docker Compose – Recommended)

```bash
# From the project root: /workspaces/fisherp

# Start all services (PostgreSQL, Redis, Django, Celery)
docker compose up -d --build

# Check service status
docker compose ps

# View Django logs
docker compose logs -f web

# View all logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v
```

**URLs after startup:**
- Backend API: http://localhost:8000
- API Docs:    http://localhost:8000/api/schema/swagger-ui/
- Health:      http://localhost:8000/health/

---

## Frontend Dev Server (Vite + React)

```bash
cd /workspaces/fisherp/fish-trading-saas/frontend

# Install dependencies (first time only)
npm install

# Start the Vite dev server
npx vite --host 0.0.0.0 --port 5173
```

**Frontend URL:** http://localhost:5173

> The Vite dev server proxies `/api` requests to `http://localhost:8000` automatically.

---

## Running Without Docker (Manual Setup)

### 1. Start PostgreSQL and Redis

If you don't have PostgreSQL/Redis running locally, start just those with Docker:

```bash
cd /workspaces/fisherp
docker compose up -d postgres redis
```

### 2. Backend (Django)

```bash
cd /workspaces/fisherp/fish-trading-saas/backend

# Set environment variables (or use .env file)
export DJANGO_SETTINGS_MODULE=config.settings
export SECRET_KEY="dev-only-insecure-key-change-in-production"
export DEBUG=True
export ALLOWED_HOSTS="localhost,127.0.0.1"
export DB_NAME=fisherp_dev
export DB_USER=fisherp_user
export DB_PASSWORD=fisherp_pass
export DB_HOST=localhost
export DB_PORT=5432
export REDIS_URL=redis://localhost:6379/0
export CELERY_BROKER_URL=redis://localhost:6379/0
export CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create a superuser (first time only)
python manage.py createsuperuser

# Start the Django development server
python manage.py runserver 0.0.0.0:8000
```

### 3. Celery Worker (optional – for background tasks)

```bash
cd /workspaces/fisherp/fish-trading-saas/backend

# Same environment variables as above, then:
celery -A trading.celery:app worker --loglevel=info --concurrency=2
```

### 4. Celery Beat (optional – for periodic tasks)

```bash
cd /workspaces/fisherp/fish-trading-saas/backend

celery -A trading.celery:app beat --loglevel=info
```

### 5. Frontend

```bash
cd /workspaces/fisherp/fish-trading-saas/frontend

npm install
npx vite --host 0.0.0.0 --port 5173
```

---

## Useful Docker Commands

```bash
# Run Django management commands inside the container
docker compose exec web python manage.py createsuperuser
docker compose exec web python manage.py shell
docker compose exec web python manage.py makemigrations
docker compose exec web python manage.py migrate

# Connect to PostgreSQL
docker compose exec postgres psql -U fisherp_user -d fisherp_dev

# Restart a single service
docker compose restart web

# Rebuild and restart a single service
docker compose up -d --build web
```

---

## Default Dev Credentials

- **Database:** `fisherp_dev` / `fisherp_user` / `fisherp_pass` (localhost:5432)
- **Redis:** localhost:6379
- See `fish-trading-saas/DEMO_CREDENTIALS.md` for app login credentials.
