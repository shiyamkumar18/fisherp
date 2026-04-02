from django.urls import path
from django.contrib.auth import views as auth_views
from .authentication import LogoutView
from .views import (
    UserRegistrationView,
    UserProfileView,
    UserListView,
    TenantUserManagementView,
    TwoFactorVerifyView,
    TwoFactorSetupView,
    TwoFactorDisableView,
    TenantLoginView,
    TenantRegisterView,
    UnifiedLoginView,
    PlatformLoginView,
    ImpersonationAPIView,
)

urlpatterns = [
    path("auth/login/", UnifiedLoginView.as_view(), name="user-login"),
    path("auth/logout/", LogoutView.as_view(), name="user-logout"),
    path("auth/logout/session/", auth_views.LogoutView.as_view(next_page='/'), name="session-logout"),
    path("auth/register/", UserRegistrationView.as_view(), name="user-register"),
    path("auth/profile/", UserProfileView.as_view(), name="user-profile"),
    path("auth/users/", UserListView.as_view(), name="user-list"),
    path("auth/tenant-users/", TenantUserManagementView.as_view(), name="tenant-user-management"),
    path("impersonate/", ImpersonationAPIView.as_view(), name="impersonation"),
    path("platform/login/", PlatformLoginView.as_view(), name="platform-login-api"),
    path("auth/platform-login/", PlatformLoginView.as_view(), name="platform-login-api-legacy"),
    path("login/<str:tenant_slug>/", TenantLoginView.as_view(), name="tenant-login-api"),
    path("register/<str:tenant_slug>/", TenantRegisterView.as_view(), name="tenant-register-api"),
    path("auth/2fa/setup/", TwoFactorSetupView.as_view(), name="2fa-setup"),
    path("auth/2fa/verify/", TwoFactorVerifyView.as_view(), name="2fa-verify"),
    path("auth/2fa/disable/", TwoFactorDisableView.as_view(), name="2fa-disable"),
]
