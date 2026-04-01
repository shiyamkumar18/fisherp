# FisherP – Docker Deployment Guide

Production-ready containerization and orchestration for the FisherP Fish Trading SaaS platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Files](#environment-files)
4. [Quick Start (Development)](#quick-start-development)
5. [PostgreSQL Stack](#postgresql-stack)
6. [Production Deployment](#production-deployment)
7. [Staging Deployment](#staging-deployment)
8. [SSL / TLS Setup](#ssl--tls-setup)
9. [Scaling](#scaling)
10. [Backup & Restore](#backup--restore)
11. [Monitoring & Logging](#monitoring--logging)
12. [Troubleshooting](#troubleshooting)
13. [Security Checklist](#security-checklist)

---

## Architecture Overview

```
Internet
    │
    ▼
┌───────────┐
│   Nginx   │  ← Reverse proxy, SSL termination, static files, rate limiting
└─────┬─────┘
      │
      ▼
┌───────────┐
│   web     │  ← Django + Gunicorn (multiple workers, scalable)
└─────┬─────┘
      │
 ┌────┴────┐
 │         │
 ▼         ▼
┌──────┐ ┌─────────┐
│ PG   │ │  Redis  │  ← Cache + Celery broker
│ Bnc  │ └─────────┘
└──┬───┘       │
   │      ┌────┴─────────────┐
   ▼      ▼                  ▼
┌──────┐ ┌────────┐  ┌──────────────┐
│Postg.│ │Celery  │  │ Celery Beat  │  ← Async & scheduled tasks
│  15  │ │Worker  │  │  Scheduler   │
└──────┘ └────────┘  └──────────────┘
```

### Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local development (SQLite, hot-reload) |
| `docker-compose.postgres.yml` | PostgreSQL + Redis (no Nginx) |
| `docker-compose.prod.yml` | Full production stack with Nginx |
| `docker-compose.staging.yml` | Staging (near-production, HTTP only) |
| `fish-trading-saas/backend/docker-compose-postgres.yml` | Backend-only reference |

---

## Prerequisites

- Docker ≥ 24.0
- Docker Compose plugin ≥ 2.20 (`docker compose` — not `docker-compose`)
- 2 vCPU / 4 GB RAM minimum for production
- Open ports: 80 (HTTP) and 443 (HTTPS)

```bash
# Verify versions
docker --version
docker compose version
```

---

## Environment Files

### Setup

```bash
# Copy the template
cp fish-trading-saas/.env.docker.example .env

# Edit with your values
nano .env
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key (≥50 random chars) |
| `DB_PASSWORD` | PostgreSQL password |
| `ALLOWED_HOSTS` | Comma-separated hostnames |

### Generate a Secure Secret Key

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
# or
openssl rand -base64 50
```

---

## Quick Start (Development)

Uses SQLite and Django's built-in development server with hot-reload.

```bash
# 1. Start the stack
docker compose up

# 2. Open a shell in the web container
docker compose exec web bash

# 3. Create a superuser
docker compose exec web python manage.py createsuperuser

# 4. Open the app
open http://localhost:8000
open http://localhost:8000/admin/
open http://localhost:8000/health/

# 5. Stop everything
docker compose down
```

---

## PostgreSQL Stack

Full PostgreSQL + Redis stack, without an Nginx reverse proxy.
Suitable for internal or VPC-isolated deployments.

```bash
# 1. Configure environment
cp fish-trading-saas/.env.docker.example .env
# Edit DB_PASSWORD, SECRET_KEY, ALLOWED_HOSTS

# 2. Start services
docker compose -f docker-compose.postgres.yml up -d

# 3. Watch logs
docker compose -f docker-compose.postgres.yml logs -f web

# 4. Run initial migration (handled by entrypoint, but also manual)
docker compose -f docker-compose.postgres.yml exec web python manage.py migrate

# 5. Create superuser
docker compose -f docker-compose.postgres.yml exec web python manage.py createsuperuser

# 6. Check service health
docker compose -f docker-compose.postgres.yml ps
```

---

## Production Deployment

Full production stack with Nginx (SSL), PgBouncer, multiple Gunicorn workers, and Celery.

### 1. Prepare the Host

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Configure Environment

```bash
cd /opt/fisherp
cp fish-trading-saas/.env.docker.example .env
nano .env   # fill in all CHANGE_ME values
```

### 3. Configure SSL (see SSL section below)

### 4. Start the Stack

```bash
# Pull pre-built images (if using a registry)
docker compose -f docker-compose.prod.yml pull

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify all services are healthy
docker compose -f docker-compose.prod.yml ps
```

### 5. Post-deployment Checks

```bash
# Application health
curl https://yourdomain.com/health/

# Database migrations (idempotent; also run by entrypoint)
docker compose -f docker-compose.prod.yml exec web python manage.py migrate

# Create initial admin user
docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

---

## Staging Deployment

```bash
cp fish-trading-saas/.env.docker.example .env
# Set ALLOWED_HOSTS=staging.fisherp.com,localhost
# Set DEBUG=False

docker compose -f docker-compose.staging.yml up -d
docker compose -f docker-compose.staging.yml exec web python manage.py createsuperuser
```

---

## SSL / TLS Setup

### Option A: Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate (standalone mode – requires port 80 free)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to Nginx SSL directory
mkdir -p fish-trading-saas/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem fish-trading-saas/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem fish-trading-saas/nginx/ssl/
sudo chown $USER:$USER fish-trading-saas/nginx/ssl/*.pem
```

### Option B: Self-signed (testing only)

```bash
mkdir -p fish-trading-saas/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout fish-trading-saas/nginx/ssl/privkey.pem \
  -out fish-trading-saas/nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

### Generate Diffie-Hellman Parameters (optional, recommended)

```bash
openssl dhparam -out fish-trading-saas/nginx/ssl/dhparam.pem 4096
# Then uncomment the ssl_dhparam line in fish-trading-saas/nginx/ssl.conf
```

---

## Scaling

### Scale Web Workers (Gunicorn)

```bash
# 3 web container replicas
docker compose -f docker-compose.prod.yml up -d --scale web=3
```

### Scale Celery Workers

```bash
docker compose -f docker-compose.prod.yml up -d --scale celery=5
```

> **Note:** `celery-beat` must remain a single instance. Never scale it.

---

## Backup & Restore

### Manual Database Backup

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U "${DB_USER}" "${DB_NAME}" \
  | gzip > "backup_$(date +%Y%m%d_%H%M%S).sql.gz"
```

### Restore from Backup

```bash
gunzip -c backup_20240101_120000.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T postgres \
      psql -U "${DB_USER}" "${DB_NAME}"
```

### Automated Backups (cron example)

```bash
# /etc/cron.d/fisherp-backup
0 2 * * * root cd /opt/fisherp && \
  docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U fisherp_user fisherp_prod | gzip > /backups/$(date +\%Y\%m\%d).sql.gz \
  && find /backups -name "*.sql.gz" -mtime +30 -delete
```

---

## Monitoring & Logging

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs --tail=100 nginx
```

### Health Status

```bash
# Service table with health status
docker compose -f docker-compose.prod.yml ps

# Detailed container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Resource Usage

```bash
docker stats --no-stream
```

### Application Health Endpoint

```bash
curl http://localhost:8000/health/          # Liveness
curl http://localhost:8000/health/ready/    # Readiness
curl http://localhost:8000/health/postgres/ # Database connectivity
```

---

## Troubleshooting

### Container Not Starting

```bash
# Check detailed status
docker compose -f docker-compose.prod.yml ps -a

# Inspect a failed container
docker compose -f docker-compose.prod.yml logs web
docker inspect fisherp_web_1
```

### Database Connection Errors

```bash
# Check PostgreSQL is healthy
docker compose -f docker-compose.prod.yml exec postgres \
  pg_isready -U "${DB_USER}" -d "${DB_NAME}"

# Test connection from web container
docker compose -f docker-compose.prod.yml exec web \
  python manage.py dbshell
```

### Nginx 502 Bad Gateway

```bash
# Check that the web service is healthy
docker compose -f docker-compose.prod.yml exec web curl -s http://localhost:8000/health/

# Check Nginx logs
docker compose -f docker-compose.prod.yml logs nginx
```

### Reset Everything (⚠️ destroys data)

```bash
docker compose -f docker-compose.prod.yml down -v --remove-orphans
docker compose -f docker-compose.prod.yml up -d
```

---

## Security Checklist

- [ ] `SECRET_KEY` is a random 50+ character string (not the example value)
- [ ] `DB_PASSWORD` is a strong random password
- [ ] `DEBUG=False` in all `.env` files for non-development stacks
- [ ] SSL certificates are valid and Nginx is listening on 443
- [ ] `ALLOWED_HOSTS` lists only actual production hostnames
- [ ] `.env` is not committed to version control (check `.gitignore`)
- [ ] PostgreSQL port 5432 is NOT exposed to the internet (use `expose:` not `ports:`)
- [ ] Redis port 6379 is NOT exposed to the internet
- [ ] Non-root container user (`appuser`) confirmed: `docker compose exec web whoami`
- [ ] Regular database backups are scheduled and tested
- [ ] Container images are scanned with `docker scout` or `trivy`
