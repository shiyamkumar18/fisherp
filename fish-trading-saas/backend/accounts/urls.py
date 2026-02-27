from django.urls import path
from django.contrib.auth import views as auth_views
from .views import (
    UserRegistrationView, 
    UserProfileView, 
    UserListView, 
    UserLoginView,
    TenantUserManagementView
)

urlpatterns = [
    path("auth/login/", UserLoginView.as_view(), name="user-login"),
    path("auth/logout/", auth_views.LogoutView.as_view(next_page='/'), name="user-logout"),
    path("auth/register/", UserRegistrationView.as_view(), name="user-register"),
    path("auth/profile/", UserProfileView.as_view(), name="user-profile"),
    path("auth/users/", UserListView.as_view(), name="user-list"),
    path("auth/tenant-users/", TenantUserManagementView.as_view(), name="tenant-user-management"),
]
