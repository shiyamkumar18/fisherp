from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.contrib.auth import views as auth_views
from accounts.views import CustomProfileRedirectView
from dashboard.admin import dashboard_site

urlpatterns = [
    # Main Django admin
    path("admin/", admin.site.urls),
    
    # Dashboard admin (analytics)
    path("dashboard/", dashboard_site.urls),

    # DRF Login
    path("api-auth/", include("rest_framework.urls")),

    # Accounts API (Auth, User Management)
    path("api/", include("accounts.urls")),
    
    # Trading API (Fish, Buyers, Purchase, Sales)
    path("api/", include("trading.urls")),
    
    # Dashboard API (Analytics, Reports)
    path("api/", include("dashboard.urls")),
    
    # Subscriptions API (Plans, Billing)
    path("api/", include("subscriptions.urls")),
    
    # Frontend login page
    path("", TemplateView.as_view(template_name="login.html"), name="login"),
    
    # Redirect /accounts/profile/ to the API profile or login
    path("accounts/profile/", CustomProfileRedirectView.as_view(), name="profile-redirect"),
]
