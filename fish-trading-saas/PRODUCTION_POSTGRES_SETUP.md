# FisherP – Production PostgreSQL Setup Guide

## Overview

This guide covers the complete production-ready PostgreSQL setup for the FisherP fish trading SaaS platform. It replaces the SQLite development database with a robust, scalable PostgreSQL instance.

---

## Architecture

```
Internet → Load Balancer → Gunicorn (4 workers)
                                │
                         PgBouncer :6432  (transaction-mode pool)
                                │
                         PostgreSQL :5432  (primary)
                                │
                         (optional) Streaming Replica
```

---

## Prerequisites

| Component        | Minimum Version |
|-----------------|-----------------|
| PostgreSQL       | 15+             |
| PgBouncer        | 1.20+           |
| Python           | 3.11+           |
| psycopg2-binary  | 2.9+            |
| Redis            | 7+              |
| Docker / Compose | 24+             |

---

## Phase 1 – Install PostgreSQL

### Option A: Docker (recommended)

```bash
# Start the full production stack
cd fish-trading-saas/backend
cp .env.example .env
# Edit .env with real credentials
docker compose -f docker-compose-postgres.yml up -d
```

### Option B: Native install (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y postgresql-15 postgresql-client-15 pgbouncer

# Start PostgreSQL
sudo systemctl enable --now postgresql
```

---

## Phase 2 – Database & User Setup

Run the initialisation SQL (handles creation idempotently):

```bash
# Docker
docker compose -f docker-compose-postgres.yml exec postgres \
    psql -U postgres -f /docker-entrypoint-initdb.d/postgres_init.sql

# Native
sudo -u postgres psql -f fish-trading-saas/backend/postgres_init.sql
```

**Important:** Replace `CHANGE_ME_IN_ENV` and `CHANGE_ME_READONLY` passwords
in `postgres_init.sql` with strong credentials, or pass them via
environment variables before executing.

---

## Phase 3 – Configure Environment

Copy and populate the environment file:

```bash
cp fish-trading-saas/backend/.env.example fish-trading-saas/backend/.env
```

Minimum required variables:

```dotenv
SECRET_KEY=<long-random-string>
DEBUG=False

DB_ENGINE=postgresql
DB_NAME=fisherp_prod
DB_USER=fisherp_user
DB_PASSWORD=<strong-password>
DB_HOST=localhost          # or 'pgbouncer' when routed through PgBouncer
DB_PORT=5432               # 6432 when using PgBouncer
DB_CONN_MAX_AGE=600        # 0 when using PgBouncer transaction mode
USE_PGBOUNCER=False        # True when routing through PgBouncer

REDIS_URL=redis://localhost:6379/0
```

---

## Phase 4 – Run Django Migrations

```bash
cd fish-trading-saas/backend
python manage.py migrate --settings=config.settings_postgres
```

---

## Phase 5 – Migrate Data from SQLite

If you have existing data in `db.sqlite3`:

```bash
# Dry run first to validate
python scripts/migrate_sqlite_to_postgres.py --dry-run

# Live migration
python scripts/migrate_sqlite_to_postgres.py

# Validate only (after migration)
python scripts/migrate_sqlite_to_postgres.py --validate-only
```

The script:
1. Validates connections to both databases.
2. Runs Django migrations on PostgreSQL.
3. Copies all rows table-by-table (FK-safe).
4. Validates row counts match.
5. Prints a migration summary and next steps.

---

## Phase 6 – Configure PgBouncer

Edit `pgbouncer.ini` to match your environment, then:

```bash
# Native
sudo cp fish-trading-saas/backend/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
sudo systemctl enable --now pgbouncer

# Docker (already configured in docker-compose-postgres.yml)
docker compose -f docker-compose-postgres.yml up -d pgbouncer
```

Update `.env` to route through PgBouncer:

```dotenv
DB_HOST=localhost
DB_PORT=6432
DB_CONN_MAX_AGE=0      # Required for transaction-mode pooling
USE_PGBOUNCER=True
```

---

## Phase 7 – Start Application

```bash
# Docker
docker compose -f docker-compose-postgres.yml up -d

# Native
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --settings config.settings_postgres
```

---

## Phase 8 – Automated Backups

Schedule daily backups with cron:

```bash
# Edit crontab
crontab -e

# Add (daily at 02:00 UTC, 30-day retention)
0 2 * * * cd /app && python scripts/backup_database.py --retain-days 30 >> /var/log/fisherp_backup.log 2>&1
```

Manual backup:

```bash
python fish-trading-saas/backend/scripts/backup_database.py \
    --output-dir /var/backups/fisherp \
    --retain-days 30
```

---

## Phase 9 – Restore from Backup

```bash
# List available backups
ls /var/backups/fisherp/

# Restore (interactive confirmation required for --drop-existing)
python fish-trading-saas/backend/scripts/restore_database.py \
    --backup /var/backups/fisherp/fisherp_prod_20240101_020000.sql.gz \
    --drop-existing
```

---

## Phase 10 – Monitoring & Health Checks

### Health endpoint

```bash
# Liveness (no auth required)
curl http://localhost:8000/health/

# Readiness
curl http://localhost:8000/health/ready/

# PostgreSQL detail (admin auth required)
curl -H "Authorization: Bearer <admin-token>" \
     http://localhost:8000/health/postgres/
```

### pg_stat_activity (connection pool monitoring)

```sql
SELECT application_name, state, count(*)
FROM pg_stat_activity
WHERE datname = 'fisherp_prod'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

### Replication lag (if replica configured)

```sql
SELECT application_name, state,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
       write_lag, replay_lag
FROM pg_stat_replication;
```

---

## Connection Pool Reference

| Setting               | Value   | Notes                                  |
|-----------------------|---------|----------------------------------------|
| `pool_mode`           | transaction | Required for stateless web apps    |
| `default_pool_size`   | 20      | Server-side connections per db/user    |
| `min_pool_size`       | 5       | Always-ready connections               |
| `reserve_pool_size`   | 5       | Burst capacity                         |
| `max_client_conn`     | 200     | Total client connections to PgBouncer  |
| `server_idle_timeout` | 600 s   | Close idle server connections          |
| Django `CONN_MAX_AGE` | 0       | **Must be 0 with transaction pooling** |

---

## Streaming Replication (HA Setup)

### Primary configuration (`postgresql.conf`)

```ini
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64MB
synchronous_commit = on
```

### Primary `pg_hba.conf`

```
host replication replication_user <replica-ip>/32 md5
```

### Create replication user

```sql
CREATE ROLE replication_user WITH REPLICATION LOGIN PASSWORD 'STRONG_PASSWORD';
```

### Replica setup

```bash
pg_basebackup -h <primary-host> -U replication_user -D /var/lib/postgresql/data -P -Xs -R
```

---

## Performance Optimisation Index

The following indexes are automatically created by Django migrations.
For additional query optimisation, analyse slow queries using:

```sql
-- Enable pg_stat_statements first
SELECT query, calls, mean_exec_time, rows
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'fisherp_prod')
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Security Checklist

- [ ] PostgreSQL not exposed on public interface (use `listen_addresses = 'localhost'`)
- [ ] Strong passwords for all database roles
- [ ] TLS enabled for PostgreSQL connections in production
- [ ] PgBouncer auth file (`userlist.txt`) has restricted permissions (`chmod 600`)
- [ ] `.env` excluded from version control (`.gitignore` entry: `.env`)
- [ ] Backups encrypted and stored off-site
- [ ] `DEBUG=False` in production environment
- [ ] Database firewall rules restrict access to application servers only

---

## Troubleshooting

### "connection refused" on port 5432

```bash
sudo systemctl status postgresql
sudo -u postgres pg_isready
```

### "too many connections"

Check active connections and pool stats:

```bash
# PgBouncer admin console
psql -h localhost -p 6432 -U fisherp_user pgbouncer -c "SHOW POOLS;"
```

### Slow queries

```bash
# Check pg_stat_statements
psql -U fisherp_user -d fisherp_prod -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"
```

### Migration script fails

```bash
# Run with verbose output
python scripts/migrate_sqlite_to_postgres.py --dry-run 2>&1 | tee /tmp/migration_dryrun.log
```
