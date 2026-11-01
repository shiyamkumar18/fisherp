# fisherp

Fish Trading Management SaaS

Last Updated: 2026-03-27

## Product Overview

Fish Trading Management SaaS is a subscription-based platform for fish mediators and tenant teams to manage:

- Purchase intake (boat, auction, bucket)
- 37 KG package standardization
- Sales and pending collections
- Expense-aware profit calculation
- Tenant-level analytics and role-based access

The core product principle is accurate profitability by including operational expenses in batch cost.

## Architecture Summary

High-level runtime flow:

1. Frontend pages (static HTML/CSS/JS)
2. Django + Django REST Framework APIs
3. PostgreSQL relational database for built-in development and production
4. Redis + Celery for async/background jobs

Current architecture characteristics:

- Single PostgreSQL database
- Company-based data isolation
- Subscription enforcement middleware
- Role-based permissions and group mapping

## Tech Stack

- Backend: Django 6, Django REST Framework, SimpleJWT, django-filter
- API docs: drf-spectacular (Swagger and ReDoc)
- Async: Celery with Redis broker/result backend
- Frontend: Static HTML/CSS/JavaScript served with Django templates/static files
- Database: PostgreSQL

## Repository Layout

```text
fish-trading-saas/
  backend/
    accounts/        # Authentication, RBAC, tenant user operations
    trading/         # Purchase, sales, inventory, tasks
    dashboard/       # Analytics endpoints/admin dashboards
    subscriptions/   # Plans, billing, subscription enforcement
    companies/       # Tenant company/domain entities
    config/          # Django settings, URL routing, ASGI/WSGI
    health/          # Liveness/readiness checks
  frontend/          # Static frontend pages and JavaScript modules
```

## Prerequisites

- Python 3.11+ recommended
- Redis 6+ (required for documented local workflow)
- `pip` and virtual environment tooling

## Quick Start

From repository root:

```bash
cd fish-trading-saas/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` inside `fish-trading-saas/backend`:

```env
SECRET_KEY=change-me-in-local
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

DB_NAME=fisherp_dev
DB_USER=fisherp_user
DB_PASSWORD=fisherp_pass
DB_HOST=localhost
DB_PORT=5432
```

Initialize RBAC and data:

```bash
python manage.py migrate
python manage.py setup_groups_and_permissions
python manage.py create_default_users
```

Start required services:

```bash
redis-server
```

In a new terminal (same virtualenv):

```bash
cd fish-trading-saas/backend
source .venv/bin/activate
celery -A trading.celery:app worker --loglevel=info
```

In another terminal (same virtualenv):

```bash
cd fish-trading-saas/backend
source .venv/bin/activate
celery -A trading.celery:app beat --loglevel=info
```

Run backend:

```bash
cd fish-trading-saas/backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

## Frontend Access

Frontend files live in `fish-trading-saas/frontend` and are used as static/template pages by Django configuration.

- App entry: `http://localhost:8000/login/`
- Default root route: `http://localhost:8000/`
- API base used by frontend scripts: `${window.location.origin}/api`

No Node build step is currently required in this repository.

## Database

FisherP requires PostgreSQL for development and production. Ensure a running PostgreSQL instance is available and configured before starting the backend.

1. Create a PostgreSQL database and user.
2. Set `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT` in `.env`.
3. Run `python manage.py migrate` to initialize the schema.

The repository includes Docker Compose stacks that wire the backend to PostgreSQL for local and production-ready deployment.

## Authentication, RBAC, and Seed Users

Role groups are created by:

```bash
python manage.py setup_groups_and_permissions
```

Default users are created by:

```bash
python manage.py create_default_users
```

Default local credentials are printed by the command output (for example tenant admin, accountant, trader, and store users). Rotate all defaults outside local development.

## API Documentation

- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
- OpenAPI schema: `http://localhost:8000/api/schema/`

Primary auth endpoint:

- `POST /api/auth/login/`

Note: API documentation endpoints are configured with authenticated access permissions.

## Health Endpoints

- Liveness: `GET /health/` or `GET /health/live/`
- Readiness: `GET /health/ready/`

Readiness checks include database, Redis, Celery ping, and cache access.

## Testing

Run all tests:

```bash
cd fish-trading-saas/backend
source .venv/bin/activate
python manage.py test
```

## Core Business Logic Snapshot

### Purchase Flow

System computes:

- `total_weight = number_of_packages * 37`
- `fish_cost = total_weight * price_per_kg`
- `total_expense = fish_cost + labour + ice + transport + commission + other`
- `actual_cost_per_kg = total_expense / total_weight`
- `pending_amount = total_expense - amount_paid`

Packages are auto-generated from purchase count.

### Sale Flow

System computes:

- `total_sale_amount = 37 * selling_price_per_kg`
- `profit = (selling_price_per_kg - actual_cost_per_kg) * 37`
- `pending_amount = total_sale_amount - amount_received`

Sold package state is updated after transaction completion.

## Deployment Notes

- Use PostgreSQL for production.
- Keep Redis and Celery worker/beat running for scheduled/background tasks.
- Set `DEBUG=False` and secure `SECRET_KEY`.
- Configure `ALLOWED_HOSTS` explicitly for deployment domains.
- Serve static files with production web server strategy.

## Roadmap (High-Level)

- Expand analytics and report exports
- Harden subscription billing workflows
- Continue performance and caching optimization
- Evolve frontend UX and PWA behavior