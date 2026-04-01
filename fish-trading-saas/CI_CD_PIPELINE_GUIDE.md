# FisherP CI/CD Pipeline Guide

## Overview

FisherP uses GitHub Actions for a fully automated CI/CD pipeline covering testing, code quality, security scanning, Docker builds, and deployment.

---

## Pipeline Architecture

```
PR Created / Push to main
        │
        ├─── Tests (test.yml)
        │      ├─ Unit tests (pytest --cov)
        │      ├─ Integration tests (-m integration)
        │      ├─ API tests (-m api)
        │      └─ Coverage report → Codecov
        │
        ├─── Code Quality (code-quality.yml)
        │      ├─ Flake8 (critical errors fail build)
        │      ├─ Black formatting check
        │      ├─ isort import sorting
        │      ├─ Bandit security analysis
        │      ├─ Radon complexity analysis
        │      └─ pip-audit dependency scan
        │
        └─── Security (security.yml)
               ├─ Bandit SAST → SARIF upload
               ├─ pip-audit dependency vulnerabilities
               ├─ Django --deploy check
               └─ TruffleHog secret detection
                          │
                 ✅ All checks pass?
                          │
                    Merge to main
                          │
               Build & Push (build.yml)
                          │
               ├─ Docker multi-stage build
               ├─ Trivy image vulnerability scan
               └─ Push to Docker registry
                          │
              Deploy to Staging (staging-deploy.yml)
                          │
               ├─ kubectl set image
               ├─ Rollout status check
               └─ Smoke tests (/health/* endpoints)
                          │
                 ✅ Staging verified?
                          │
            Manual: Deploy to Production (prod-deploy.yml)
                          │
               ├─ Confirmation required
               ├─ Database backup
               ├─ Blue-green deployment
               ├─ Health checks
               └─ Traffic switchover
                          │
                  Production Live! 🚀
                          │
               Rollback available (rollback.yml)
```

---

## Workflows Reference

### 1. `test.yml` – Tests

**Triggers:** Push to `main`/`develop`/`copilot/**`, PR to `main`/`develop`

| Job | What it does |
|-----|-------------|
| `unit-tests` | Runs pytest across all apps, generates coverage XML, uploads to Codecov |
| `lint` | Flake8 with max-line-length=120 |

**Environment variables required:** None (uses safe defaults)

---

### 2. `code-quality.yml` – Code Quality

**Triggers:** PR to `main`/`develop`, push to `main`

| Job | What it does |
|-----|-------------|
| `flake8` | Critical errors fail the build; full report is informational |
| `black` | Checks code formatting (line-length=120) |
| `isort` | Checks import ordering (black-compatible profile) |
| `bandit` | SAST scan – uploads JSON report as artifact |
| `complexity` | Radon cyclomatic complexity & maintainability index |
| `pip-audit` | Audits `requirements.txt` for CVEs |

---

### 3. `security.yml` – Security Scanning

**Triggers:** PR to `main`/`develop`, push to `main`, nightly schedule (02:00 UTC)

| Job | What it does |
|-----|-------------|
| `bandit` | SAST scan, uploads SARIF to GitHub Security tab |
| `dependency-scan` | pip-audit for known CVEs, uploads JSON artifact |
| `django-security-check` | `manage.py check --deploy` |
| `secret-detection` | TruffleHog scans for hardcoded secrets |

---

### 4. `build.yml` – Docker Build & Push

**Triggers:** Push to `main`, manual (`workflow_dispatch`)

| Step | What it does |
|------|-------------|
| Build image | Multi-stage Docker build with layer caching |
| Push to registry | Only when `DOCKER_USERNAME` secret is set |
| Trivy scan | Vulnerability scan of built image, uploads SARIF |

**Required secrets** (optional – build still runs without them):
- `DOCKER_REGISTRY`
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`

---

### 5. `staging-deploy.yml` – Staging Deployment

**Triggers:** After successful `Build & Push Docker Image` on `main`, manual dispatch

| Step | What it does |
|------|-------------|
| Deploy | `kubectl set image` → `kubectl rollout status` |
| Smoke tests | Verifies `/health/`, `/health/ready/`, `/health/live/` return 200 |

**Required secrets:**
- `KUBE_CONFIG` (base64-encoded kubeconfig)
- `DOCKER_REGISTRY`

**Required variables:**
- `STAGING_URL`

---

### 6. `prod-deploy.yml` – Production Deployment

**Triggers:** Manual only (`workflow_dispatch`) with confirmation

| Input | Description |
|-------|-------------|
| `image_tag` | Docker image tag to deploy |
| `confirm` | Must be exactly `deploy-to-production` |

**Deployment strategy:** Blue-green (zero downtime)
1. Deploy to inactive slot
2. Run health checks on new slot
3. Switch service traffic
4. Verify production health

**Required secrets:**
- `KUBE_CONFIG`
- `DOCKER_REGISTRY`

---

### 7. `rollback.yml` – Production Rollback

**Triggers:** Manual only with confirmation

| Input | Description |
|-------|-------------|
| `reason` | Reason for rollback (audit trail) |
| `confirm` | Must be exactly `rollback-production` |

Switches traffic back to the previously active blue/green slot.

---

### 8. `performance-test.yml` – Performance Testing

**Triggers:** PR to `main`, manual dispatch

| Job | What it does |
|-----|-------------|
| `load-test` | Locust load test against Django dev server |
| `response-time-benchmark` | Measures p95 response times for health endpoints |

---

### 9. `scheduled-checks.yml` – Nightly Checks

**Triggers:** Nightly at 03:00 UTC, manual dispatch

| Job | What it does |
|-----|-------------|
| `dependency-audit` | pip-audit for all requirements |
| `bandit-nightly` | Full bandit scan (all severity levels) |
| `outdated-packages` | Lists outdated pip packages |
| `django-check` | `manage.py check --fail-level WARNING` |

---

### 10. `release.yml` – Release Automation

**Triggers:** Push of `v*.*.*` tags, manual dispatch

| Step | What it does |
|------|-------------|
| Validate version | Checks semver format |
| Build release image | Builds and pushes Docker image tagged with version |
| Create GitHub Release | Auto-generates changelog from git log |

**Usage:**
```bash
git tag v1.2.3
git push origin v1.2.3
```

---

## Setting Up the Pipeline

### 1. Fork / clone the repository

```bash
git clone https://github.com/shiyamkumar18/fisherp.git
```

### 2. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Required by | Description |
|--------|------------|-------------|
| `DOCKER_REGISTRY` | build, staging, prod | Registry URL |
| `DOCKER_USERNAME` | build | Registry username |
| `DOCKER_PASSWORD` | build | Registry password/token |
| `KUBE_CONFIG` | staging, prod, rollback | Base64 kubeconfig |

```bash
# Encode your kubeconfig
base64 -w0 ~/.kube/config
```

### 3. Configure GitHub Variables

Go to **Settings → Secrets and variables → Actions → Variables** and add:

| Variable | Description |
|----------|-------------|
| `STAGING_URL` | `https://staging.fisherp.com` |
| `PRODUCTION_URL` | `https://app.fisherp.com` |

### 4. Enable GitHub Advanced Security (for SARIF uploads)

To see Bandit and Trivy results in the Security tab:
1. Go to **Settings → Security & analysis**
2. Enable **Code scanning**
3. Enable **Dependency graph**

---

## Local Quality Checks

Run the same checks locally before pushing:

```bash
cd fish-trading-saas/backend

# Install dev tools
pip install black isort flake8 bandit radon pip-audit

# Format code
black --line-length=120 .
isort --profile=black --line-length=120 .

# Check linting
flake8 . --max-line-length=120 --exclude=migrations

# Security scan
bandit -r . --exclude ./migrations -ll

# Dependency audit
pip-audit -r requirements.txt

# Run tests with coverage
mkdir -p logs
python -m pytest --cov=. --cov-report=term-missing
```

---

## Typical Pipeline Durations

| Workflow | Jobs | Duration |
|----------|------|---------|
| Tests | unit-tests + lint | ~5 min |
| Code Quality | 5 parallel jobs | ~3 min |
| Security | 4 parallel jobs | ~3 min |
| Build | build + trivy | ~8 min |
| Staging Deploy | deploy + smoke tests | ~3 min |
| Production Deploy | blue-green + verification | ~5 min |
| **Total (PR → Production)** | | **~27 min** |

---

## Troubleshooting Workflows

### Tests fail in CI but pass locally

1. Check that `DJANGO_SETTINGS_MODULE=config.settings_test` is used
2. Ensure `mkdir -p logs` runs before tests
3. Verify no `.env` file with different settings is picked up

### Docker build fails

1. Check `fish-trading-saas/backend/Dockerfile` exists
2. Verify `requirements.txt` is up to date
3. Check for build errors in the workflow log

### Deployment workflow skipped

Deployment steps that require `KUBE_CONFIG` are automatically skipped when the secret is not configured. This allows the pipeline to run in environments without Kubernetes.

### SARIF upload errors

SARIF uploads to GitHub Security require GitHub Advanced Security to be enabled on the repository. The upload steps use `continue-on-error: true` to avoid failing the pipeline.
