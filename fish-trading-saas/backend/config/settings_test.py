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

from config.settings import *  # noqa: E402, F401, F403  # keep after env defaults

# ---- Force safe test values regardless of .env contents ----
DEBUG = True
SECRET_KEY = os.environ["SECRET_KEY"]

# Disable SSL enforcement so HTTP test clients don't get 301 redirects
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
