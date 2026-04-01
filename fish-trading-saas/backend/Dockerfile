# =============================================================================
# FisherP – Django Backend Dockerfile
# Multi-stage build for minimal, secure production image
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder – install Python dependencies in a virtual environment
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Build-time environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build dependencies (needed for psycopg2-binary compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment for cleaner dependency isolation
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies (layer-cached until requirements change)
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: Runtime – minimal image with only what is needed to run
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

# Runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    # Create non-root user for security
    && groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --no-create-home --shell /bin/false appuser

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application source code (build context is fish-trading-saas/backend/)
COPY --chown=appuser:appgroup . /app/

# Create required runtime directories
RUN mkdir -p /app/logs /app/staticfiles /app/media \
    && chown -R appuser:appgroup /app/logs /app/staticfiles /app/media

# Copy and configure the Docker entrypoint
# The scripts/ directory here refers to fish-trading-saas/backend/scripts/
# (which mirrors fish-trading-saas/scripts/ — see docker-compose build context note)
COPY --chown=appuser:appgroup scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy health-check script
COPY --chown=appuser:appgroup scripts/health-check.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

# Switch to non-root user
USER appuser

EXPOSE 8000

# Container health check (matches Django /health/ endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD /healthcheck.sh

ENTRYPOINT ["/entrypoint.sh"]

# Default command: Gunicorn with 4 sync workers
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--timeout", "120", \
     "--keep-alive", "5", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
