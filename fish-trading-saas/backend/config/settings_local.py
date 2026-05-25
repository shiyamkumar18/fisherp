"""
Local Development Settings

Extend base settings.py with development-friendly overrides.
Usage: manage.py --settings=config.settings_local

WARNING: Never use these settings in production.
"""

from datetime import timedelta  # noqa: E402
from .settings import *  # noqa: F401, F403

# -------------------------
# Development-only overrides
# -------------------------

DEBUG = True

# Allow all local hosts in development
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]

# Relax CORS for local development servers (Vite, CRA, etc.)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Use SQLite only for local development to avoid PostgreSQL dependency.
# This is temporary and keeps PostgreSQL production configuration intact.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
    }
}

# Disable HTTPS-only cookie flags locally
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0

# Relaxed throttling for local development
REST_FRAMEWORK = {  # type: ignore[assignment]
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": "1000/hour",
        "user": "5000/hour",
        "login": "100/min",
        "impersonate": "100/hour",
    },
}

# Shorter JWT lifetime for quicker iteration locally
SIMPLE_JWT = {  # type: ignore[assignment]
    **SIMPLE_JWT,  # noqa: F405
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
}

# Show all logging in the console during development
LOGGING["handlers"]["console"]["level"] = "DEBUG"  # noqa: F405
LOGGING["root"]["level"] = "DEBUG"  # noqa: F405
