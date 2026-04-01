"""
Staging Settings

Extends settings_postgres but disables SSL enforcement, since staging is
deployed as HTTP-only (TLS is terminated externally or not used).
"""

from config.settings_postgres import *  # noqa: F401, F403

# Staging is HTTP-only — disable SSL redirect and HSTS to prevent redirect loops
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
