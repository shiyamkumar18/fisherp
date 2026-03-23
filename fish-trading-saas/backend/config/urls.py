from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.contrib.auth import views as auth_views
from accounts.views import CustomProfileRedirectView, UnifiedLoginView, TenantRegisterView, PlatformLoginView
from dashboard.admin import dashboard_site
from accounts.admin_sites import platform_admin_site
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    
    # Main Django admin (for superusers only)
    path("admin/", admin.site.urls),
    
    # Platform Admin - For platform operators ONLY (uses _admin suffix)
    path("platform-admin/", platform_admin_site.urls),
    
    # Unified Login for ALL company users (tenant_admin, accountant, trader, store)
    # Primary URL for company users: /web/login/
    path("web/login/", UnifiedLoginView.as_view(), name="unified-login"),
    
    # Backward compatibility: /login/ also routes to company login
    path("login/", UnifiedLoginView.as_view(), name="login-compat"),
    
    # Platform Login for platform operators (platform_operator, platform_super_admin)
    # Uses _admin suffix: /login/_admin/
    path("login/_admin/", PlatformLoginView.as_view(), name="platform-login"),
    
    # Register new company
    path("register/", TenantRegisterView.as_view(), name="register"),
    
    # Dashboard admin (analytics)
    path("dashboard/", dashboard_site.urls),

    # DRF Login
    path("api-auth/", include("rest_framework.urls")),

    # Accounts API (Auth, User Management)
    path("api/", include("accounts.urls")),
    
    # Trading API (Fish, Buyers, Purchase, Sales)
    path("api/", include("trading.urls")),
    # Backward-compatible trading prefix
    path("api/trading/", include("trading.urls")),
    
    # Dashboard API (Analytics, Reports)
    path("api/", include("dashboard.urls")),
    
    # Subscriptions API (Plans, Billing)
    path("api/", include("subscriptions.urls")),
    
    # Health checks (k8s readiness/liveness)
    path('health/', include('health.urls')),
    
    # Platform Manager API (SaaS-level management)
    path("api/platform/", include("saas_admin.urls")),
    
    # Tenant-specific login URLs (e.g., /acme-corp/login/)
    path("<str:tenant_slug>/login/", UnifiedLoginView.as_view(), name="tenant-login"),
    path("<str:tenant_slug>/register/", TenantRegisterView.as_view(), name="tenant-register"),
    
    # Frontend login page (default) - redirect to /web/login/
    path("", TemplateView.as_view(template_name="login.html", extra_context={"redirect_to": "/web/login/"}), name="index"),
    
    # Redirect /accounts/profile/ to the API profile or login
    path("accounts/profile/", CustomProfileRedirectView.as_view(), name="profile-redirect"),
]
