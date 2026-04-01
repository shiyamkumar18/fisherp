# FisherP – CI/CD Pipeline Guide

## Overview

FisherP uses GitHub Actions for its CI/CD pipeline. The pipeline enforces code quality,
security, and automated deployments at every stage.

---

## Pipeline Architecture

```
PR / Push to main
        │
        ├─► test.yml          – Unit & integration tests
        ├─► code-quality.yml  – Lint, format, type check, complexity
        └─► security.yml      – Bandit, pip-audit, secret scan
                │
                │ (all pass)
                ▼
        Push to main only
                │
                ├─► build.yml           – Build & push Docker image
                │         │
                │         ▼
                └─► staging-deploy.yml  – Auto-deploy to staging
                              │
                              │ (manual trigger)
                              ▼
                    prod-deploy.yml     – Deploy to production
```

---

## Workflows

### 1. Test Suite (`test.yml`)

**Triggers:** Push to `main`, `develop`, `copilot/**`; PR to `main`, `develop`

| Job | Description |
|-----|-------------|
| `test` | Runs the full test suite with PostgreSQL service |
| `lint` | Flake8 linting |

**Key steps:**
- Spins up a PostgreSQL 15 service container
- Installs production + dev dependencies
- Sets minimal `.env` for CI
- Runs migrations
- Executes pytest with coverage reporting
- Uploads coverage to Codecov

---

### 2. Code Quality (`code-quality.yml`)

**Triggers:** Push to `main`, `develop`, `copilot/**`; PR to `main`, `develop`

| Job | Description |
|-----|-------------|
| `lint` | Flake8 + Black + isort checks |
| `type-check` | mypy type checking |
| `complexity` | Radon cyclomatic complexity & maintainability index |

**Enforced rules:**
- No syntax errors (`E9`, `F63`, `F7`, `F82`)
- Code complexity ≤ 15
- Line length ≤ 120 characters

---

### 3. Security Scanning (`security.yml`)

**Triggers:** Push to `main`, `develop`; PR to `main`, `develop`; nightly cron (02:00 UTC)

| Job | Description |
|-----|-------------|
| `bandit` | Static security analysis of Python code |
| `dependency-audit` | `pip-audit` vulnerability scan |
| `django-security-check` | `manage.py check --deploy` |
| `secret-scan` | TruffleHog secret detection |

---

### 4. Build Docker Image (`build.yml`)

**Triggers:** Push to `main`; manual `workflow_dispatch`

| Step | Description |
|------|-------------|
| Docker Buildx setup | Enables multi-platform builds |
| GHCR login | Authenticates with GitHub Container Registry |
| Metadata extraction | Generates version tags |
| Build & push | Multi-stage build with GHA layer cache |
| Trivy scan | Vulnerability scan of the built image |

**Image tags produced:**
- `ghcr.io/<owner>/fisherp:latest` (on `main`)
- `ghcr.io/<owner>/fisherp:main`
- `ghcr.io/<owner>/fisherp:sha-<sha>`

---

### 5. Staging Deployment (`staging-deploy.yml`)

**Triggers:** After successful `Build Docker Image` on `main`; manual `workflow_dispatch`

| Step | Description |
|------|-------------|
| Deploy via SSH | Pulls image and restarts container |
| Health check | Polls `/health/` up to 12 times (2 min timeout) |
| Smoke tests | Checks critical endpoints return expected status codes |

**Required configuration:**
- `vars.STAGING_HOST` – Staging server hostname/IP
- `vars.STAGING_USER` – SSH username
- `vars.STAGING_URL` – Staging base URL
- `secrets.STAGING_SSH_KEY` – SSH private key

---

### 6. Production Deployment (`prod-deploy.yml`)

**Triggers:** Manual `workflow_dispatch` only (requires approval)

**Inputs:**
| Input | Description | Required |
|-------|-------------|----------|
| `image_tag` | Docker image tag to deploy | Yes |
| `skip_backup` | Skip pre-deploy DB backup | No (default: false) |

**Deployment steps:**
1. Verify staging is healthy
2. Create database backup (unless skipped)
3. Pull specified Docker image
4. Run pending migrations
5. Restart production container
6. Wait 30 s then run health checks (10 attempts, 15 s apart)
7. Run smoke tests

**Required configuration:**
- `vars.PRODUCTION_HOST` – Production server hostname/IP
- `vars.PRODUCTION_USER` – SSH username
- `vars.PRODUCTION_URL` – Production base URL
- `secrets.PRODUCTION_SSH_KEY` – SSH private key

---

### 7. Rollback (`rollback.yml`)

**Triggers:** Manual `workflow_dispatch` only

**Inputs:**
| Input | Description | Required |
|-------|-------------|----------|
| `image_tag` | Tag to roll back to (blank = previous) | No |
| `reason` | Reason for rollback | Yes |

The workflow reads `/srv/fisherp/previous_image.txt` on the server (written by
`prod-deploy.yml`) to determine the previous image if no tag is specified.

---

### 8. Performance Testing (`performance-test.yml`)

**Triggers:** PR to `main`; weekly cron (Monday 03:00 UTC); manual `workflow_dispatch`

| Step | Description |
|------|-------------|
| Pytest slow tests | Tests marked `@pytest.mark.slow` |
| API response times | Checks key endpoints against ms thresholds |

**Response time thresholds:**
| Endpoint | Threshold |
|----------|-----------|
| `/health/` | 500 ms |
| `/health/ready/` | 500 ms |
| `/api/schema/` | 2000 ms |

---

### 9. Scheduled Checks (`scheduled-checks.yml`)

**Triggers:** Nightly cron (01:00 UTC); manual `workflow_dispatch`

| Job | Description |
|-----|-------------|
| `dependency-check` | `pip-audit` scan of production requirements |
| `bandit-nightly` | Full bandit security scan |
| `stale-dependency-check` | Lists outdated packages |

Reports are uploaded as workflow artifacts (30-day retention).

---

### 10. Release (`release.yml`)

**Triggers:** Push of `v*.*.*` tag; manual `workflow_dispatch`

| Step | Description |
|------|-------------|
| Changelog generation | Git log since previous tag |
| GitHub Release creation | With auto-generated release notes |
| Release image build | Tags image with version number and `latest` |

---

## Configuration Files

### `.flake8`
Flake8 linting configuration. Located at `fish-trading-saas/backend/.flake8`.

Key settings:
- `max-line-length = 120`
- `max-complexity = 15`
- Excludes: migrations, venv, build artifacts

### `pyproject.toml`
Tool configuration for Black, isort, mypy, and pytest.
Located at `fish-trading-saas/backend/pyproject.toml`.

### `.bandit`
Bandit security scanner configuration.
Located at `fish-trading-saas/backend/.bandit`.

---

## GitHub Configuration

### Setting Up Secrets

1. Go to **Settings → Secrets and variables → Actions**
2. Add the following secrets:

| Secret | Required for |
|--------|-------------|
| `PRODUCTION_SSH_KEY` | Production deployment |
| `STAGING_SSH_KEY` | Staging deployment |

### Setting Up Variables

1. Go to **Settings → Secrets and variables → Actions → Variables**
2. Add the following variables:

| Variable | Required for |
|----------|-------------|
| `PRODUCTION_HOST` | Production deployment |
| `PRODUCTION_USER` | Production deployment |
| `PRODUCTION_URL` | Production deployment + health checks |
| `STAGING_HOST` | Staging deployment |
| `STAGING_USER` | Staging deployment |
| `STAGING_URL` | Staging deployment + health checks |

### Protecting the `main` Branch

1. Go to **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date
   - ✅ Required status checks: `test / test`, `lint / lint`, `Code Quality / lint`
   - ✅ Require pull request reviews before merging
   - ✅ Dismiss stale pull request approvals when new commits are pushed

---

## Typical Run Times

| Workflow | Duration |
|----------|----------|
| Test Suite | ~5–8 min |
| Code Quality | ~2–3 min |
| Security Scanning | ~3–5 min |
| Build Docker Image | ~5–10 min |
| Staging Deployment | ~2–4 min |
| Production Deployment | ~3–5 min |
| **Total (PR)** | **~10–16 min** |

---

## Troubleshooting

### Tests fail in CI but pass locally

- Ensure you're using Python 3.12 locally
- Check that `logs/` directory exists (`mkdir -p logs`)
- Verify `DJANGO_SETTINGS_MODULE=config.settings_test`

### Docker build fails

- Check that `fish-trading-saas/backend/Dockerfile` exists
- Verify `requirements.txt` has no broken packages

### Deployment health check times out

- SSH into the server and check `docker logs fisherp-prod`
- Verify the `.env` file on the server is correct
- Check that port 8000 is accessible

### Rollback fails

- Confirm `/srv/fisherp/previous_image.txt` exists on the server
- Or provide an explicit image tag when triggering the rollback workflow
