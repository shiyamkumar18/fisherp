from django.urls import path
from django.contrib.auth import views as auth_views
from .views import (
    UserRegistrationView, 
    UserProfileView, 
    UserListView, 
    UserLoginView,
    TenantUserManagementView,
    TwoFactorVerifyView,
    TwoFactorSetupView,
    TwoFactorDisableView,
    TenantLoginView,
    TenantRegisterView,
    UnifiedLoginView,
    PlatformLoginView,
)
from .views.impersonation import ImpersonationAPIView

urlpatterns = [
    # Main login/register endpoints
    path("auth/login/", UnifiedLoginView.as_view(), name="user-login"),
    path("auth/logout/", auth_views.LogoutView.as_view(next_page='/'), name="user-logout"),
    path("auth/register/", UserRegistrationView.as_view(), name="user-register"),
    path("auth/profile/", UserProfileView.as_view(), name="user-profile"),
    path("auth/users/", UserListView.as_view(), name="user-list"),
    path("auth/tenant-users/", TenantUserManagementView.as_view(), name="tenant-user-management"),
    
    # Impersonation endpoints
    path("impersonate/", ImpersonationAPIView.as_view(), name="impersonation"),
    
    # Platform admin login (API endpoint for /login/_admin/ form)
    path("auth/platform-login/", PlatformLoginView.as_view(), name="platform-login-api"),
    
    # Tenant-specific login URLs under API (e.g., /api/login/acme-corp/)
    path("login/<str:tenant_slug>/", TenantLoginView.as_view(), name="tenant-login-api"),
    path("register/<str:tenant_slug>/", TenantRegisterView.as_view(), name="tenant-register-api"),
    
    # Two-Factor Authentication
    path("auth/2fa/setup/", TwoFactorSetupView.as_view(), name="2fa-setup"),
    path("auth/2fa/verify/", TwoFactorVerifyView.as_view(), name="2fa-verify"),
    path("auth/2fa/disable/", TwoFactorDisableView.as_view(), name="2fa-disable"),
]
