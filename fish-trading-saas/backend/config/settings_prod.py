"""
Production Settings

Strict, secure settings for live deployments.
Usage: manage.py --settings=config.settings_prod
       or set DJANGO_SETTINGS_MODULE=config.settings_prod

All secrets MUST be supplied via environment variables — no hardcoded values.
"""

import os
from .settings import *  # noqa: F401, F403

# -------------------------
# Safety guard
# -------------------------

DEBUG = False

_debug_env = os.getenv("DEBUG", "False").strip().lower()
if _debug_env in ("true", "1", "yes", "on"):
    raise RuntimeError(
        "DEBUG must not be True in production. "
        "Unset the DEBUG environment variable or set it to False."
    )

# -------------------------
# Allowed hosts (required in production)
# -------------------------

_extra_hosts = [
    h.strip()
    for h in os.getenv("ALLOWED_HOSTS", "").split(",")
    if h.strip()
]
if not _extra_hosts:
    raise RuntimeError(
        "ALLOWED_HOSTS environment variable must list at least one production hostname."
    )
ALLOWED_HOSTS = _extra_hosts

# -------------------------
# HTTPS / SSL enforcement
# -------------------------

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000       # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# -------------------------
# PostgreSQL (required in production)
# -------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ["DB_HOST"],
        "PORT": os.getenv("DB_PORT", "5432"),
        "CONN_MAX_AGE": 600,
        "OPTIONS": {
            "connect_timeout": 10,
            "application_name": "fisherp",
            "sslmode": os.getenv("DB_SSLMODE", "require"),
        },
    }
}

# -------------------------
# CORS: explicit domain whitelist only
# -------------------------

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = list(filter(None, [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]))
if not CORS_ALLOWED_ORIGINS:
    raise RuntimeError(
        "CORS_ALLOWED_ORIGINS environment variable must list at least one allowed origin."
    )

# -------------------------
# Strict rate limiting for production
# -------------------------

REST_FRAMEWORK = {  # type: ignore[assignment]
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "login": "5/min",
        "impersonate": "2/hour",
    },
}

# -------------------------
# Cache (Redis required in production)
# -------------------------

_redis_url = os.environ.get("REDIS_URL")
if not _redis_url:
    raise RuntimeError(
        "REDIS_URL environment variable is required in production. "
        "Example: redis://redis-host:6379/1"
    )
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": _redis_url,
    }
}

# -------------------------
# Email (production SMTP)
# -------------------------

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.sendgrid.net")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@fisherp.com")
SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL)

# -------------------------
# Sentry error tracking (optional but recommended)
# -------------------------

_sentry_dsn = os.getenv("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration

        sentry_sdk.init(
            dsn=_sentry_dsn,
            integrations=[DjangoIntegration()],
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.05")),
            send_default_pii=False,
            environment="production",
        )
    except ImportError:
        pass  # sentry-sdk not installed — skip silently

# -------------------------
# Structured logging for production
# -------------------------

LOGGING = {  # type: ignore[assignment]
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "json": {
            "()": "pythonjsonlogger.json.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(BASE_DIR / "logs/django.log"),  # noqa: F405
            "maxBytes": 1024 * 1024 * 10,  # 10 MB
            "backupCount": 10,
            "formatter": "verbose",
        },
        "security_file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(BASE_DIR / "logs/security.log"),  # noqa: F405
            "maxBytes": 1024 * 1024 * 10,  # 10 MB
            "backupCount": 10,
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": "INFO",
    },
    "loggers": {
        "django.security": {
            "handlers": ["security_file", "console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["file", "console"],
            "level": "ERROR",
            "propagate": False,
        },
        "accounts.auth": {
            "handlers": ["security_file", "console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
