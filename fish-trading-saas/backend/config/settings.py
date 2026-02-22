"""
Django settings for config project.
Phase 0 – SaaS Multi-Tenant Foundation
"""

from pathlib import Path
from dotenv import load_dotenv
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

SHARED_APPS = [
    "django_tenants",
    "companies",
    "accounts",

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

TENANT_APPS = [
    "rest_framework",
    "corsheaders",

    "trading",
    "subscriptions",
    "dashboard",
]

INSTALLED_APPS = SHARED_APPS + TENANT_APPS

TENANT_MODEL = "companies.Company"
TENANT_DOMAIN_MODEL = "companies.Domain"

# =========================
# MIDDLEWARE
# =========================

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
        "DIRS": [],
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