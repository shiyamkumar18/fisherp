"""
Test-specific Django settings.

Overrides production settings for the automated test suite:
- Provides a default SECRET_KEY so tests run without a .env file
- Sets DEBUG=True to disable SECURE_SSL_REDIRECT and HSTS
- Explicitly disables SSL enforcement for HTTP test clients

Usage: set DJANGO_SETTINGS_MODULE=config.settings_test before running pytest,
or use the pytest.ini DJANGO_SETTINGS_MODULE directive.
"""
import os

# Provide defaults for required env vars before importing base settings,
# so tests can run without a .env file (e.g. in CI or fresh clones).
os.environ.setdefault(
    "SECRET_KEY",
    "django-insecure-test-only-not-for-production-change-this-before-deploying",
)
os.environ.setdefault("DEBUG", "True")
os.environ.setdefault("DB_NAME", "fisherp_test")
os.environ.setdefault("DB_USER", "fisherp_user")
os.environ.setdefault("DB_PASSWORD", "fisherp_pass")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from config.settings import *  # noqa: E402, F401, F403  # keep after env defaults

# ---- Force safe test values regardless of .env contents ----
DEBUG = True
SECRET_KEY = os.environ["SECRET_KEY"]

# Allow Django's test client host.
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

# Use PostgreSQL for tests to match production database behavior.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ["DB_HOST"],
        "PORT": os.environ["DB_PORT"],
        "CONN_MAX_AGE": 0,
        "OPTIONS": {
            "connect_timeout": 10,
            "application_name": "fisherp_test",
        },
    }
}
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable throttling for test execution to avoid intermittent 429 failures.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        **REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),  # noqa: F405
        "impersonate": "100000/hour",
    },
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
}

# Disable SSL enforcement so HTTP test clients don't get 301 redirects
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
DEBUG_PROPAGATE_EXCEPTIONS = True
