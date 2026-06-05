from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView, TemplateView
from accounts.views import CustomProfileRedirectView, UnifiedLoginView, TenantRegisterView, PlatformLoginView
from companies.views import CompanyDetailsView
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
    # Clean Login URLs (FINAL PRODUCTION)
    # Tenant users: /login/
    path("login/", UnifiedLoginView.as_view(), name="tenant-login"),
    
    # Platform users: /platform/login/
    path("platform/login/", PlatformLoginView.as_view(), name="platform-login"),
    
    # Frontend HTML pages served via Django templates
    path("landing.html", TemplateView.as_view(template_name="landing.html"), name="landing-html"),
    path("login.html", TemplateView.as_view(template_name="login.html"), name="login-html"),
    path("login_admin.html", RedirectView.as_view(url='/login.html', permanent=False), name="login-admin-html"),
    path("register.html", TemplateView.as_view(template_name="register.html"), name="register-html"),
    path("dashboard.html", TemplateView.as_view(template_name="dashboard_base.html"), name="dashboard-html"),
    path("dashboard-content.html", TemplateView.as_view(template_name="dashboard-content.html"), name="dashboard-content-html"),
    path("platform/dashboard.html", TemplateView.as_view(template_name="platform_dashboard_base.html"), name="platform-dashboard-html"),
    path("fish.html", TemplateView.as_view(template_name="fish.html"), name="fish-html"),
    path("fishCategories.html", TemplateView.as_view(template_name="fishCategories.html"), name="fish-categories-html"),
    path("buyers.html", TemplateView.as_view(template_name="buyers.html"), name="buyers-html"),
    path("suppliers.html", TemplateView.as_view(template_name="suppliers.html"), name="suppliers-html"),
    path("purchases.html", TemplateView.as_view(template_name="purchases.html"), name="purchases-html"),
    path("sales.html", TemplateView.as_view(template_name="sales.html"), name="sales-html"),
    path("inventory.html", TemplateView.as_view(template_name="inventory.html"), name="inventory-html"),
    path("payments.html", TemplateView.as_view(template_name="payments.html"), name="payments-html"),
    path("reports.html", TemplateView.as_view(template_name="reports.html"), name="reports-html"),
    path("analytics.html", TemplateView.as_view(template_name="analytics.html"), name="analytics-html"),
    path("settings.html", TemplateView.as_view(template_name="settings.html"), name="settings-html"),
    path("company-settings.html", TemplateView.as_view(template_name="company-settings.html"), name="company-settings-html"),
    path("products-master.html", TemplateView.as_view(template_name="products-master.html"), name="products-master-html"),
    path("customers-mgmt.html", TemplateView.as_view(template_name="customers-mgmt.html"), name="customers-mgmt-html"),
    path("suppliers-mgmt.html", TemplateView.as_view(template_name="suppliers-mgmt.html"), name="suppliers-mgmt-html"),
    path("users.html", TemplateView.as_view(template_name="users.html"), name="users-html"),
    path("subscriptions.html", TemplateView.as_view(template_name="subscriptions.html"), name="subscriptions-html"),
    path("competencies.html", TemplateView.as_view(template_name="competencies.html"), name="competencies-html"),
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
    
    # Landing page (default) - shows company info, then login/register popup
    path("", RedirectView.as_view(url='/landing.html', permanent=False), name="index"),
    
    # Redirect /accounts/profile/ to the API profile or login
    path("accounts/profile/", CustomProfileRedirectView.as_view(), name="profile-redirect"),
]

# Serve frontend static assets (css/, js/, icons/, app/, etc.) at root path during development
from django.conf import settings  # noqa: E402
if settings.DEBUG:
    from django.conf.urls.static import static
    # Determine the correct frontend path (Docker vs local)
    frontend_path = settings.BASE_DIR / "frontend"
    if not frontend_path.exists():
        frontend_path = settings.BASE_DIR.parent / "frontend"
    urlpatterns += static("/", document_root=frontend_path)
