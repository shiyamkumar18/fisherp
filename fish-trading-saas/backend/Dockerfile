# ===========================================================================
# FisherP Backend – Production Dockerfile
# ===========================================================================
# Multi-stage build:
#   1. builder  – install Python dependencies into a virtual environment
#   2. runtime  – minimal image with only the venv and app code
# ===========================================================================

# ---- Stage 1: dependency builder ----
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System build dependencies (for psycopg2 compilation etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ---- Stage 2: runtime image ----
FROM python:3.12-slim AS runtime

LABEL org.opencontainers.image.title="FisherP Backend" \
      org.opencontainers.image.description="Fish Trading SaaS – Django REST API" \
      org.opencontainers.image.source="https://github.com/shiyamkumar18/fisherp"

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings_postgres

# Runtime system dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY . .

# Create non-root user for security
RUN groupadd -r fisherp && useradd -r -g fisherp -d /app -s /sbin/nologin fisherp && \
    mkdir -p /app/logs /app/staticfiles /app/media && \
    chown -R fisherp:fisherp /app

USER fisherp

# Collect static files at build time (non-fatal – may need DB env vars at runtime)
RUN SECRET_KEY=build-time-placeholder \
    DEBUG=False \
    ALLOWED_HOSTS=build.localhost \
    python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info"]
