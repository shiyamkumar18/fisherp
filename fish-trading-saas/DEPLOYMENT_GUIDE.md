# FisherP Deployment Guide

## Overview

This guide covers deploying FisherP to production using Docker, PostgreSQL, and the automated CI/CD pipeline.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Docker | 24.x | Container runtime |
| Docker Compose | 2.x | Local/staging orchestration |
| kubectl | 1.28+ | Kubernetes (production) |
| Python | 3.12 | Backend runtime |
| PostgreSQL | 15 | Primary database |
| Redis | 7 | Cache & Celery broker |

---

## Local Development Setup

### 1. Clone & configure

```bash
git clone https://github.com/shiyamkumar18/fisherp.git
cd fisherp/fish-trading-saas/backend

cp .env.example .env
# Edit .env with your local values
```

### 2. Start services with Docker Compose

```bash
# Start full stack (PostgreSQL, PgBouncer, Redis, Django, Celery)
docker compose -f docker-compose-postgres.yml up -d

# Check logs
docker compose -f docker-compose-postgres.yml logs -f backend
```

### 3. Run migrations & create superuser

```bash
docker compose -f docker-compose-postgres.yml exec backend \
    python manage.py migrate

docker compose -f docker-compose-postgres.yml exec backend \
    python manage.py createsuperuser
```

---

## Environment Variables Reference

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `abc123...` | Django secret key (50+ chars, random) |
| `DEBUG` | `False` | Must be `False` in production |
| `ALLOWED_HOSTS` | `api.fisherp.com,fisherp.com` | Comma-separated allowed hostnames |
| `DB_NAME` | `fisherp_prod` | PostgreSQL database name |
| `DB_USER` | `fisherp_user` | PostgreSQL user |
| `DB_PASSWORD` | `strongpassword` | PostgreSQL password |
| `DB_HOST` | `localhost` | PostgreSQL host |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_SSLMODE` | `require` | PostgreSQL SSL mode |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | `15` | JWT access token lifetime |
| `CORS_ALLOWED_ORIGINS` | *(empty)* | Comma-separated CORS origins |
| `SENTRY_DSN` | *(empty)* | Sentry error tracking DSN |

### Generating a SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Docker Image Build

### Build locally

```bash
cd fish-trading-saas/backend
docker build -t fisherp-backend:latest .
```

### Build with BuildKit (faster, with caching)

```bash
DOCKER_BUILDKIT=1 docker build \
  --cache-from fisherp-backend:buildcache \
  -t fisherp-backend:latest \
  .
```

---

## Database Management

### Run migrations

```bash
python manage.py migrate --noinput
```

### Create a database backup

```bash
python scripts/backup_database.py
# Backup saved to backups/fisherp_backup_<timestamp>.sql
```

### Restore from backup

```bash
python scripts/restore_database.py backups/fisherp_backup_<timestamp>.sql
```

### Migrate from SQLite to PostgreSQL

```bash
# 1. Export from SQLite
python manage.py dumpdata --natural-foreign --natural-primary \
  --exclude=contenttypes --exclude=auth.permission \
  -o data_export.json

# 2. Switch to PostgreSQL settings and run migrations
DJANGO_SETTINGS_MODULE=config.settings_postgres python manage.py migrate

# 3. Import data
DJANGO_SETTINGS_MODULE=config.settings_postgres python manage.py loaddata data_export.json
```

---

## Production Deployment (Kubernetes)

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `DOCKER_REGISTRY` | Docker registry URL (e.g. `registry.hub.docker.com/myorg`) |
| `DOCKER_USERNAME` | Registry username |
| `DOCKER_PASSWORD` | Registry password / token |
| `KUBE_CONFIG` | Base64-encoded kubeconfig (`base64 -w0 ~/.kube/config`) |
| `SLACK_WEBHOOK` | Slack webhook URL for deployment notifications |

### Required GitHub Variables

Configure these in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description |
|----------|-------------|
| `STAGING_URL` | Staging environment URL (e.g. `https://staging.fisherp.com`) |
| `PRODUCTION_URL` | Production URL (e.g. `https://app.fisherp.com`) |

### Deploy to Production

1. Merge your PR to `main`
2. The **Build & Push Docker Image** workflow runs automatically
3. On success, **Deploy to Staging** runs automatically
4. Verify staging at `$STAGING_URL`
5. Go to **Actions → Deploy to Production → Run workflow**
6. Enter the image tag (git SHA) and type `deploy-to-production` to confirm

---

## Health Checks

The API exposes the following health endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /health/` | Basic application liveness |
| `GET /health/ready/` | Readiness (DB + dependencies) |
| `GET /health/live/` | Liveness probe |
| `GET /health/postgres/` | PostgreSQL connectivity |

---

## Rolling Back a Production Deployment

If a deployment causes issues:

1. Go to **Actions → Rollback Production → Run workflow**
2. Enter the reason for rollback
3. Type `rollback-production` to confirm
4. The pipeline switches traffic back to the previous blue/green slot

---

## Monitoring

### Application Logs

```bash
# Docker Compose
docker compose -f docker-compose-postgres.yml logs -f backend

# Kubernetes
kubectl logs -f deployment/fisherp-prod --namespace=production
```

### Sentry Error Tracking

Set `SENTRY_DSN` in your production `.env` to enable automatic error reporting.

### Performance Metrics

Run the performance test workflow manually:
**Actions → Performance Tests → Run workflow**

---

## Security Checklist

- [ ] `DEBUG=False` in all production deployments
- [ ] `SECRET_KEY` is unique, random, and at least 50 characters
- [ ] Database uses SSL (`DB_SSLMODE=require`)
- [ ] `ALLOWED_HOSTS` contains only your domain(s)
- [ ] HTTPS enforced (`SECURE_SSL_REDIRECT=True`)
- [ ] HSTS enabled (`SECURE_HSTS_SECONDS=31536000`)
- [ ] Secure cookies (`SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`)
- [ ] CORS restricted to known origins
- [ ] No secrets committed to version control
- [ ] Docker image runs as non-root user
- [ ] Database credentials are strong and rotated regularly

---

## Troubleshooting

### Common Issues

**502 Bad Gateway after deployment**
- Check backend pod logs: `kubectl logs -f deployment/fisherp-prod`
- Verify health endpoint: `curl https://app.fisherp.com/health/`

**Database connection errors**
- Verify `DB_HOST`, `DB_USER`, `DB_PASSWORD` environment variables
- Check PostgreSQL is running and accessible from the backend pod
- Test: `kubectl exec -it deployment/fisherp-prod -- python manage.py dbshell`

**Static files not loading**
- Run `python manage.py collectstatic --noinput`
- Ensure `STATIC_ROOT` is correctly configured and served by nginx

**Migration failures**
- Always create a database backup before migrations
- Roll back to the previous image if migration is not reversible
- Check migration state: `python manage.py showmigrations`
