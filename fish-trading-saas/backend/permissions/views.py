"""
Permissions API Views
=====================
Provides endpoints consumed by the frontend to:
  1. List all roles with their default permission matrix  → GET /api/permissions/roles/
  2. Get one role's permission matrix by name             → GET /api/permissions/roles/<name>/
  3. Check a single user + module + action               → GET /api/permissions/check/?module=&action=

These are used for:
  - Auto-filling the permission matrix in the UI when a role is selected
  - Tenant admin customisation
  - Frontend permission-aware UI hiding/showing
"""
from django.db.models import Prefetch
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Permission, Role, RolePermission
from .serializers import RoleSerializer


class RoleListView(APIView):
    """
    GET /api/permissions/roles/
    Returns all roles with their full default permission matrix.

    Response shape:
    [
      {
        "id": 1,
        "name": "Accountant",
        "description": "...",
        "is_system_admin": false,
        "permissions": {
          "dashboard":  {"view": true,  "create": false, ...},
          "sales":      {"view": true,  ...},
          ...
        }
      },
      ...
    ]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.prefetch_related(
            Prefetch(
                'role_permissions',
                queryset=RolePermission.objects.select_related('permission').filter(allowed=True),
            )
        ).order_by('id')

        all_modules = list(Permission.objects.values_list('module', flat=True).distinct().order_by('module'))
        all_actions = list(Permission.objects.values_list('action', flat=True).distinct().order_by('action'))

        data = []
        for role in roles:
            # Build nested dict: module → action → bool
            perm_matrix = {
                module: {action: False for action in all_actions}
                for module in all_modules
            }
            for rp in role.role_permissions.all():
                mod = rp.permission.module
                act = rp.permission.action
                if mod in perm_matrix and act in perm_matrix[mod]:
                    perm_matrix[mod][act] = True

            data.append({
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'is_system_admin': role.is_system_admin,
                'permissions': perm_matrix,
            })

        return Response(data)


class RoleDetailView(APIView):
    """
    GET /api/permissions/roles/<role_name>/
    Returns the permission matrix for one specific role (by name).

    Useful for the "select role → auto-fill" feature in the UI.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, role_name):
        try:
            role = Role.objects.prefetch_related(
                Prefetch(
                    'role_permissions',
                    queryset=RolePermission.objects.select_related('permission').filter(allowed=True),
                )
            ).get(name=role_name)
        except Role.DoesNotExist:
            return Response(
                {'detail': f"Role '{role_name}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        all_modules = list(Permission.objects.values_list('module', flat=True).distinct().order_by('module'))
        all_actions = list(Permission.objects.values_list('action', flat=True).distinct().order_by('action'))

        perm_matrix = {
            module: {action: False for action in all_actions}
            for module in all_modules
        }
        for rp in role.role_permissions.all():
            mod = rp.permission.module
            act = rp.permission.action
            if mod in perm_matrix and act in perm_matrix[mod]:
                perm_matrix[mod][act] = True

        return Response({
            'id': role.id,
            'name': role.name,
            'description': role.description,
            'is_system_admin': role.is_system_admin,
            'permissions': perm_matrix,
        })


class PermissionCheckView(APIView):
    """
    GET /api/permissions/check/?module=sales&action=create
    Returns whether the currently authenticated user has the requested permission.

    Response:
    {
      "module": "sales",
      "action": "create",
      "allowed": true
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        module = request.query_params.get('module', '').strip()
        action = request.query_params.get('action', '').strip()

        if not module or not action:
            return Response(
                {'detail': 'Both "module" and "action" query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from accounts.permissions import check_module_permission
        allowed = check_module_permission(request.user, module, action)

        return Response({
            'module': module,
            'action': action,
            'allowed': allowed,
        })
