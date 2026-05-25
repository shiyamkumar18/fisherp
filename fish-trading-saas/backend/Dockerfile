# =============================================================================
# FisherP – Django Backend Dockerfile
# Multi-stage build for minimal, secure production image
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Python Builder – install Python dependencies in a virtual environment
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS python-builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /tmp/python-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements-prod.txt ./
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements-prod.txt

# ---------------------------------------------------------------------------
# Stage 2: Frontend Builder – build Vite assets for production
# ---------------------------------------------------------------------------
FROM node:20-slim AS frontend-builder

WORKDIR /tmp/frontend-builder

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Runtime – minimal image with only what is needed to run
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
        postgresql-client \
        redis-tools \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --no-create-home --shell /bin/false appuser

COPY --from=python-builder /opt/venv /opt/venv
COPY --from=frontend-builder /tmp/frontend-builder/dist /app/frontend/dist
COPY --chown=appuser:appgroup backend /app

RUN mkdir -p /app/logs /app/staticfiles /app/media \
    && chown -R appuser:appgroup /app/logs /app/staticfiles /app/media /app/frontend/dist

COPY --chown=appuser:appgroup backend/scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY --chown=appuser:appgroup backend/scripts/health-check.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /healthcheck.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
