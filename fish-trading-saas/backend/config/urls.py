
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from accounts.views import CustomProfileRedirectView, UnifiedLoginView, TenantRegisterView, PlatformLoginView
from companies.views import CompanyDetailsView
from dashboard.admin import dashboard_site
from accounts.admin_sites import platform_admin_site
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .spa_views import serve_spa_index



# Root API health/info endpoint
@require_GET
def root(request):
    """
    Root endpoint for API health check.
    Returns a simple JSON message indicating the API is running.
    """
    return JsonResponse({"message": "API running"})

urlpatterns = [
    # Root API health/info endpoint
    path("", root, name="api-root"),

    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Main Django admin (for superusers only)
    path("admin/", admin.site.urls),

    # Platform Admin - For platform operators ONLY (uses _admin suffix)
    path("platform-admin/", platform_admin_site.urls),

    # Unified Login for ALL company users (tenant_admin, accountant, trader, store)
    path("login/", UnifiedLoginView.as_view(), name="tenant-login"),

    # Platform users: /platform/login/
    path("platform/login/", PlatformLoginView.as_view(), name="platform-login"),

    path("register/", TenantRegisterView.as_view(), name="register"),

    # Dashboard admin (analytics)
    path("dashboard/", dashboard_site.urls),

    # DRF Login
    path("api-auth/", include("rest_framework.urls")),

    # Accounts API (Auth, User Management)
    path("api/", include("accounts.urls")),

    # Companies API (Company/Shop Settings)
    path("api/companies/", CompanyDetailsView.as_view(), name="company-details"),
    path("api/companies/details/", CompanyDetailsView.as_view(), name="company-details-endpoint"),

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

    # Redirect /accounts/profile/ to the API profile or login
    path("accounts/profile/", CustomProfileRedirectView.as_view(), name="profile-redirect"),

    # SPA fallback: serve Vite build index.html for frontend routes
    # Keep this at the end so it doesn't steal API/admin routes.
    path("<path:frontend_path>", serve_spa_index, name="spa-fallback"),

]


# Serve frontend static assets (css/, js/, icons/, app/, etc.) at root path during development
from django.conf import settings  # noqa: E402
if settings.DEBUG:
    from django.conf.urls.static import static

    frontend_source = settings.BASE_DIR / "frontend"
    frontend_dist = frontend_source / "dist"

    if frontend_dist.exists():
        frontend_path = frontend_dist
    elif frontend_source.exists():
        frontend_path = frontend_source
    else:
        frontend_path = settings.BASE_DIR.parent / "frontend"
        if (frontend_path / "dist").exists():
            frontend_path = frontend_path / "dist"

    urlpatterns = urlpatterns[:-1] + static("/", document_root=frontend_path) + [urlpatterns[-1]]
