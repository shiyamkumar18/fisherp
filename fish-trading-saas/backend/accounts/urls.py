from django.urls import path
from django.contrib.auth import views as auth_views
from .authentication import LogoutView
from .views import (
    DeviceSessionView,
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
    SendOTPView,
    VerifyOTPView,
    ChangePasswordView,
)
from .views.multi_identifier_auth import MultiIdentifierLoginView, SimpleRegistrationView
from .views_google import GoogleLogin

from .views_invite import InvitePlatformStaffView, AcceptPlatformInviteView

urlpatterns = [
    # NEW MULTI-IDENTIFIER LOGIN/REGISTRATION (RECOMMENDED)
    path("login/", MultiIdentifierLoginView.as_view(), name="multi-identifier-login"),
    path("register/", SimpleRegistrationView.as_view(), name="multi-identifier-register"),
    
    # Platform Staff Invite System
    path("platform/invite/", InvitePlatformStaffView.as_view(), name="platform-invite"),
    path("platform/invite/accept/", AcceptPlatformInviteView.as_view(), name="platform-invite-accept"),

    # Legacy endpoints (kept for backward compatibility)
    path("send-otp/", SendOTPView.as_view(), name="send-otp"),
    path("verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("auth/login/", UnifiedLoginView.as_view(), name="user-login"),
    path("auth/logout/", LogoutView.as_view(), name="user-logout"),
    path("auth/logout/session/", auth_views.LogoutView.as_view(next_page='/'), name="session-logout"),
    path("auth/register/", UserRegistrationView.as_view(), name="user-register"),
    path("auth/profile/", UserProfileView.as_view(), name="user-profile"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("auth/users/", UserListView.as_view(), name="user-list"),
    path("auth/tenant-users/", TenantUserManagementView.as_view(), name="tenant-user-management"),
    path("impersonate/", ImpersonationAPIView.as_view(), name="impersonation"),
    path("platform/login/", PlatformLoginView.as_view(), name="platform-login-api"),
    path("auth/google/", GoogleLogin.as_view(), name="google-login"),
    path("auth/platform-login/", PlatformLoginView.as_view(), name="platform-login-api-legacy"),
    path("login/<str:tenant_slug>/", TenantLoginView.as_view(), name="tenant-login-api"),
    path("register/<str:tenant_slug>/", TenantRegisterView.as_view(), name="tenant-register-api"),
    path("auth/2fa/setup/", TwoFactorSetupView.as_view(), name="2fa-setup"),
    path("auth/2fa/verify/", TwoFactorVerifyView.as_view(), name="2fa-verify"),
    path("auth/2fa/disable/", TwoFactorDisableView.as_view(), name="2fa-disable"),
]
urlpatterns += [
    path("auth/sessions/", DeviceSessionView.as_view(), name="user-sessions"),
]
