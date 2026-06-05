"""
PostgreSQL-specific Django settings for production.

Usage:
    Set DJANGO_SETTINGS_MODULE=config.settings_postgres  OR
    import this module at the end of config/settings.py when DB_ENGINE=postgresql.

This module extends the base settings.py with PostgreSQL optimizations.
"""

from config.settings import *  # noqa: F401, F403
import os

# =========================
# POSTGRESQL DATABASE
# =========================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
        # Reuse connections for up to 10 minutes (connection pooling)
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "600")),
        "OPTIONS": {
            # Abort connection attempts that take longer than this (seconds)
            "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
            # Helps identify this app's connections in pg_stat_activity
            "application_name": "fisherp",
        },
    }
}

# =========================
# CONNECTION POOL (PgBouncer awareness)
# =========================
# When routing through PgBouncer (transaction-mode pooling), persistent
# connections must be disabled, as PgBouncer assigns a new server-side
# connection per transaction.
if os.getenv("USE_PGBOUNCER", "False") == "True":
    DATABASES["default"]["CONN_MAX_AGE"] = 0

# =========================
# CACHES (Redis — strongly recommended for production)
# =========================
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "TIMEOUT": 300,  # 5 minutes default TTL
        "KEY_PREFIX": "fisherp",
    }
}

# Session stored in Redis for scalability
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# =========================
# SECURITY (production-only overrides)
# =========================
DEBUG = False

SECURE_SSL_REDIRECT = True
# Trust the X-Forwarded-Proto header set by Nginx/load-balancer
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000       # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# =========================
# LOGGING  (structured JSON to file for production)
# =========================
from pathlib import Path  # noqa: E402

_BASE_DIR = Path(__file__).resolve().parent.parent
_LOG_DIR = _BASE_DIR / "logs"
_LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(_LOG_DIR / "django.log"),
            "maxBytes": 1024 * 1024 * 10,  # 10 MB
            "backupCount": 10,
            "formatter": "json",
        },
        "console": {
            "level": "WARNING",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["file", "console"],
        "level": "INFO",
    },
    "loggers": {
        "django.db.backends": {
            # Log slow queries (>1 s) – requires DEBUG=True in Django, so this
            # captures queries that go over the threshold via a custom filter.
            "handlers": ["file"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["file", "console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["file"],
            "level": "ERROR",
            "propagate": True,
        },
    },
}
