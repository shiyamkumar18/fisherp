"""
Django settings for config project.
Phase 0 – SaaS Multi-Tenant Foundation
"""

from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env
load_dotenv(BASE_DIR / ".env")

# SECURITY
SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG") == "True"
ALLOWED_HOSTS = []

# =========================
# MULTI-TENANT CONFIG
# =========================

# Check if we're using SQLite (testing mode without PostgreSQL)
USE_SQLITE = not (os.getenv("DB_NAME") and os.getenv("DB_USER"))

if USE_SQLITE:
    # Simplified config for testing without PostgreSQL
    SHARED_APPS = [
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
        "rest_framework",
        "rest_framework_simplejwt",
        "corsheaders",
        "django_filters",
        "accounts",
        "companies",
        "trading",
        "subscriptions",
        "dashboard",
    ]
    
    TENANT_APPS = []
    
    INSTALLED_APPS = SHARED_APPS
    
    # Required for django-tenants compatibility
    TENANT_MODEL = "accounts.User"
else:
    SHARED_APPS = [
        "django_tenants",
        "accounts",
        "companies",
    
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
    ]
    
    TENANT_APPS = [
        "rest_framework",
        "rest_framework_simplejwt",
        "corsheaders",
        "django_filters",
    
        "trading",
        "subscriptions",
        "dashboard",
    ]
    
    INSTALLED_APPS = SHARED_APPS + TENANT_APPS
    
    TENANT_MODEL = "accounts.User"

# =========================
# MIDDLEWARE
# =========================

if USE_SQLITE:
    MIDDLEWARE = [
        "django.middleware.security.SecurityMiddleware",
        "corsheaders.middleware.CorsMiddleware",
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.common.CommonMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
        "subscriptions.middleware.SubscriptionEnforcementMiddleware",
    ]
else:
    MIDDLEWARE = [
        "django_tenants.middleware.main.TenantMainMiddleware",
        "django.middleware.security.SecurityMiddleware",
        "corsheaders.middleware.CorsMiddleware",
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.common.CommonMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
    ]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
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
# DATABASE (Schema-Based)
# =========================

# Use SQLite for testing if PostgreSQL not configured
if os.getenv("DB_NAME") and os.getenv("DB_USER"):
    DATABASES = {
        "default": {
            "ENGINE": "django_tenants.postgresql_backend",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST"),
            "PORT": os.getenv("DB_PORT"),
        }
    }
else:
    # Use SQLite for testing/development
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

if not USE_SQLITE:
    DATABASE_ROUTERS = (
        "django_tenants.routers.TenantSyncRouter",
    )

# =========================
# AUTHENTICATION
# =========================

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Login/Logout Redirects
LOGIN_REDIRECT_URL = "/api/auth/profile/"
LOGOUT_REDIRECT_URL = "/"
LOGIN_URL = "/api-auth/login/"

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

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# =========================
# CORS (DEV ONLY)
# =========================

CORS_ALLOW_ALL_ORIGINS = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}

# JWT Settings
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}
