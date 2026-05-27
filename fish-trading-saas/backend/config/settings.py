"""
Django settings for config project.
Phase 0 – SaaS Multi-Tenant Foundation
"""

from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import os
import sys

# Use custom allauth adapter for Google login
SOCIALACCOUNT_ADAPTER = "accounts.adapters.CustomSocialAccountAdapter"


BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, os.path.join(BASE_DIR))

# Load .env
load_dotenv(BASE_DIR / ".env")

# SECURITY
secret_key = os.getenv("SECRET_KEY")
if not secret_key:
    raise ValueError("SECRET_KEY environment variable required")
SECRET_KEY = secret_key
DEBUG = os.getenv("DEBUG", "False") == "True"
DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1']
ALLOWED_HOSTS = DEFAULT_ALLOWED_HOSTS + [
    host.strip()
    for host in os.getenv('ALLOWED_HOSTS', '').split(',')
    if host.strip()
]

# =========================
# MULTI-TENANT CONFIG
# =========================

SHARED_APPS = [
    "accounts",
    "companies",

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.postgres",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

TENANT_APPS = [
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    "trading",
    "voice",  # Voice Assistant
    "subscriptions",
    "dashboard",
    "saas_admin",  # Platform Manager App
]

INSTALLED_APPS = SHARED_APPS + TENANT_APPS + [
    "django.contrib.sites",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "dj_rest_auth",
]

SITE_ID = 1

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID"),
            "secret": os.getenv("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_SECRET"),
        }
    }
}

# =========================
# MIDDLEWARE
# =========================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "accounts.middleware.ImpersonationMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "subscriptions.middleware.SubscriptionEnforcementMiddleware",
    "config.middleware_security.SecurityHeadersMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "templates", 
            BASE_DIR / "frontend",  # Docker path
            BASE_DIR.parent / "frontend",  # Local development path
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# =========================
# DATABASE
# =========================

if DEBUG:
    _db_name = os.getenv("DB_NAME", "fisherp_dev")
    _db_user = os.getenv("DB_USER", "fisherp_user")
    _db_password = os.getenv("DB_PASSWORD", "fisherp_pass")
    _db_host = os.getenv("DB_HOST", "localhost")
else:
    _db_name = os.getenv("DB_NAME")
    _db_user = os.getenv("DB_USER")
    _db_password = os.getenv("DB_PASSWORD")
    _db_host = os.getenv("DB_HOST")

_db_port = os.getenv("DB_PORT", "5432")

if not DEBUG:
    _missing_db_env_vars = [
        var_name
        for var_name, var_value in [
            ("DB_NAME", _db_name),
            ("DB_USER", _db_user),
            ("DB_PASSWORD", _db_password),
            ("DB_HOST", _db_host),
        ]
        if not var_value
    ]
    if _missing_db_env_vars:
        raise ValueError(
            "Missing required database environment variable(s) for PostgreSQL: "
            + ", ".join(_missing_db_env_vars)
        )

# When routing through PgBouncer in transaction mode, persistent connections
# must be disabled (CONN_MAX_AGE=0).
_use_pgbouncer = os.getenv("USE_PGBOUNCER", "").lower() in ("1", "true", "yes")
_conn_max_age = 0 if _use_pgbouncer else int(os.getenv("DB_CONN_MAX_AGE", "600"))

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _db_name,
        "USER": _db_user,
        "PASSWORD": _db_password,
        "HOST": _db_host,
        "PORT": _db_port,
        "CONN_MAX_AGE": _conn_max_age,
        "OPTIONS": {
            "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
            "application_name": "fisherp",
        },
    }
}

# =========================
# AUTHENTICATION
# =========================

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Login/Logout Redirects
LOGIN_REDIRECT_URL = "/api/auth/profile/"
LOGOUT_REDIRECT_URL = "/"
LOGIN_URL = "/api-auth/login/"

# Custom authentication backend: accepts email or username
AUTHENTICATION_BACKENDS = [
    "accounts.authentication.EmailOrUsernameBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# Security Headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
REFERRER_POLICY = 'strict-origin-when-cross-origin'

_testing = "test" in sys.argv
if not DEBUG and not _testing:
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = True

# Secure Cookies
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# =========================
# INTERNATIONALIZATION
# =========================

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# =========================
# STATIC FILES
# =========================

STATIC_URL = '/static/'
# Only include frontend build assets in STATICFILES_DIRS if they exist.
# In Docker, frontend is mounted at /app/frontend, outside Docker at BASE_DIR.parent / "frontend".
_frontend_paths = [
    BASE_DIR / "frontend" / "dist",
    BASE_DIR.parent / "frontend" / "dist",
    BASE_DIR / "frontend",
    BASE_DIR.parent / "frontend",
]
STATICFILES_DIRS = [path for path in _frontend_paths if path.exists()]
STATIC_ROOT = BASE_DIR / "staticfiles"

# =========================
# CORS (DEV ONLY)
# =========================

CORS_ALLOW_ALL_ORIGINS = False

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle"
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "50/hour",
        "user": "500/hour",
        "login": "5/min",
        "impersonate": "2/hour",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", "15"))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=JWT_ACCESS_TOKEN_LIFETIME_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# =========================
# AUTHENTICATION CONSTANTS
# =========================
AUTH_MAX_USERS_PER_TENANT = 3
AUTH_LOGIN_ATTEMPT_LIMIT = 5
AUTH_LOCKOUT_DURATION_MINUTES = 15
TWO_FACTOR_TOKEN_LIFETIME_MINUTES = 5

# =========================
# CORS CONFIGURATION
# =========================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:5173",
] if DEBUG else list(filter(None, [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "https://app.fisherp.com,https://fisherp.com").split(",")
    if origin.strip()
]))

CORS_ALLOW_CREDENTIALS = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'


CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Celery Configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', CELERY_BROKER_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_BEAT_SCHEDULE = {
    'check-overdue-suppliers': {
        'task': 'trading.tasks.check_overdue_suppliers',
        'schedule': 3600.0,  # Hourly
    },
}
# =========================
# DRF SPECTACULAR (API DOCUMENTATION)
# =========================
SPECTACULAR_SETTINGS = {
    'TITLE': 'Fish Trading SaaS API',
    'DESCRIPTION': 'API for fish trading and supply chain management',
    'VERSION': '1.0.0',
    'SERVE_PERMISSIONS': ['rest_framework.permissions.AllowAny'],
    'SERVERS': [
        {
            'url': 'http://localhost:8000',
            'description': 'Development server',
        },
        {
            'url': 'https://api.fisherp.com',
            'description': 'Production server',
        },
    ],
}

# Production Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/django.log',
            'maxBytes': 1024 * 1024 * 5,  # 5MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG' if DEBUG else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'security_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/security.log',
            'maxBytes': 1024 * 1024 * 5,  # 5MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django.security': {
            'handlers': ['console', 'security_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file', 'console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'accounts.auth': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
