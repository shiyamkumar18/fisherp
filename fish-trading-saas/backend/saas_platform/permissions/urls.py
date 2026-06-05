from django.urls import path
from .views import RoleListView, RoleDetailView, PermissionCheckView

urlpatterns = [
    # List all roles with their permission matrix
    # Frontend uses this to auto-fill the matrix when a role is selected
    path('roles/', RoleListView.as_view(), name='permission-role-list'),

    # Get a single role's permission matrix by name (URL-encoded)
    # e.g. GET /api/permissions/roles/Accountant/
    path('roles/<str:role_name>/', RoleDetailView.as_view(), name='permission-role-detail'),

    # Check if the current user has a specific module+action permission
    # e.g. GET /api/permissions/check/?module=sales&action=create
    path('check/', PermissionCheckView.as_view(), name='permission-check'),
]
