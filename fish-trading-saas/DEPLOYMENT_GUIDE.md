# FisherP – Deployment Guide

## Overview

This guide covers all aspects of deploying FisherP to staging and production environments.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker | ≥ 24.x | Container runtime |
| Docker Compose | ≥ 2.20 | Orchestration |
| Python | 3.12 | Runtime (inside container) |
| PostgreSQL | 15 | Primary database |
| Redis | 7 | Cache & Celery broker |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all required values.  
**Never commit `.env` to version control.**

```bash
cp fish-trading-saas/backend/.env.example fish-trading-saas/backend/.env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key (50+ random chars) | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | Must be `False` in production | `False` |
| `ALLOWED_HOSTS` | Comma-separated hostnames | `api.fisherp.com,fisherp.com` |
| `DB_NAME` | PostgreSQL database name | `fisherp_prod` |
| `DB_USER` | PostgreSQL username | `fisherp_user` |
| `DB_PASSWORD` | PostgreSQL password (strong) | *(generate securely)* |
| `DB_HOST` | PostgreSQL host | `localhost` or RDS endpoint |
| `DB_PORT` | PostgreSQL port | `5432` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |

---

## Local Development

```bash
# 1. Install Python dependencies
cd fish-trading-saas/backend
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 2. Set up environment
cp .env.example .env
# Edit .env with your local values

# 3. Create log directory
mkdir -p logs

# 4. Run migrations
python manage.py migrate

# 5. Create superuser
python manage.py createsuperuser

# 6. Start development server
python manage.py runserver
```

---

## Docker Deployment

### Build the Image

```bash
# From the repository root
docker build \
  -t fisherp:latest \
  -f fish-trading-saas/backend/Dockerfile \
  fish-trading-saas/backend
```

### Run with Docker Compose (Full Stack)

```bash
cd fish-trading-saas/backend

# Copy and configure environment
cp .env.example .env
# Edit .env with production values

# Start all services
docker compose -f docker-compose-postgres.yml up -d

# Check service health
docker compose -f docker-compose-postgres.yml ps

# View logs
docker compose -f docker-compose-postgres.yml logs -f backend
```

### First-time Setup

```bash
# Run database migrations
docker exec fisherp-backend python manage.py migrate

# Create superuser
docker exec -it fisherp-backend python manage.py createsuperuser

# Collect static files
docker exec fisherp-backend python manage.py collectstatic --noinput
```

---

## Production Deployment via GitHub Actions

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `PRODUCTION_SSH_KEY` | SSH private key for production server |
| `STAGING_SSH_KEY` | SSH private key for staging server |

### Required GitHub Variables

Configure these in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `PRODUCTION_HOST` | Production server IP/hostname | `prod.fisherp.com` |
| `PRODUCTION_USER` | SSH username on production server | `deploy` |
| `PRODUCTION_URL` | Production base URL | `https://api.fisherp.com` |
| `STAGING_HOST` | Staging server IP/hostname | `staging.fisherp.com` |
| `STAGING_USER` | SSH username on staging server | `deploy` |
| `STAGING_URL` | Staging base URL | `https://staging-api.fisherp.com` |

### Deployment Flow

```
Push to main
    ↓
Test Suite passes (test.yml)
    ↓
Code Quality passes (code-quality.yml)
    ↓
Security Scan passes (security.yml)
    ↓
Build Docker Image (build.yml)
    ↓
Auto-deploy to Staging (staging-deploy.yml)
    ↓
Smoke tests pass
    ↓
Manual: Trigger Production Deploy (prod-deploy.yml)
```

### Triggering a Production Deployment

1. Navigate to **Actions → Production Deployment**
2. Click **Run workflow**
3. Enter the Docker image tag (e.g., `sha-abc1234` or `v1.2.3`)
4. Click **Run workflow**

The workflow will:
1. Check staging is healthy
2. Create a database backup
3. Pull and deploy the specified image
4. Run post-deployment health checks

---

## Rollback

If a production deployment fails:

1. Navigate to **Actions → Rollback Production**
2. Click **Run workflow**
3. Optionally enter the image tag to roll back to (leave blank for previous)
4. Enter a reason for the rollback
5. Click **Run workflow**

---

## Health Endpoints

| Endpoint | Description | Expected Response |
|----------|-------------|-------------------|
| `/health/` | General health | `200 OK` |
| `/health/ready/` | Readiness probe | `200 OK` |
| `/health/live/` | Liveness probe | `200 OK` |
| `/health/postgres/` | Database health | `200 OK` |

---

## Database Backups

### Manual Backup

```bash
# Dump data from running container
docker exec fisherp-prod \
  python manage.py dumpdata \
  --natural-foreign --natural-primary \
  --indent 2 \
  > backup_$(date +%Y%m%d_%H%M%S).json

# Compress
gzip backup_*.json
```

### Restore from Backup

```bash
# Decompress
gunzip backup_20240101_120000.json.gz

# Load data
docker exec -i fisherp-prod \
  python manage.py loaddata backup_20240101_120000.json
```

---

## Monitoring

### View Application Logs

```bash
# Tail live logs
docker logs -f fisherp-prod

# Last 100 lines
docker logs --tail=100 fisherp-prod

# Logs from specific time
docker logs --since="2024-01-01T12:00:00" fisherp-prod
```

### Check Service Status

```bash
# All containers
docker ps --filter "name=fisherp"

# Inspect a container
docker inspect fisherp-prod | python -m json.tool
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs fisherp-prod

# Check environment variables
docker exec fisherp-prod env | grep -v PASSWORD | grep -v SECRET
```

### Database connection errors

```bash
# Test PostgreSQL connectivity
docker exec fisherp-prod python manage.py dbshell -- --command "\conninfo"

# Check PostgreSQL is running
docker exec fisherp-postgres pg_isready
```

### Migration errors

```bash
# Show pending migrations
docker exec fisherp-prod python manage.py showmigrations

# Run migrations manually
docker exec fisherp-prod python manage.py migrate --noinput
```

---

## Security Checklist

Before every production deployment:

- [ ] `DEBUG=False` in production environment
- [ ] `SECRET_KEY` is unique and not in version control
- [ ] `ALLOWED_HOSTS` lists only your domain(s)
- [ ] Database password is strong and rotated regularly
- [ ] HTTPS is enforced (`SECURE_SSL_REDIRECT=True`)
- [ ] All GitHub Secrets are set correctly
- [ ] Docker image has been scanned for vulnerabilities
- [ ] Dependencies are up to date (`pip-audit` passes)
- [ ] Staging deployment was tested first
- [ ] Database backup was created before deploy
