from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

class PermissionCheckMiddleware(MiddlewareMixin):
    """Simple permission enforcement middleware.
    It expects request.user to have an attribute `tenant_role` linking to a TenantRole.
    The middleware checks a mapping from HTTP method + path to a (module, action) tuple.
    For brevity, only GET (view) and POST/PUT/PATCH (edit/create) are demonstrated.
    """

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Bypass if user is not authenticated or is a system admin
        if not request.user.is_authenticated:
            return None
        if getattr(request.user, "is_superuser", False):
            return None
        tenant_role = getattr(request.user, "tenant_role", None)
        if not tenant_role:
            return None
        # Determine module and action from request path (very naive heuristic)
        path = request.path.lower()
        # Extract first segment after /api/ as module name
        module = None
        if path.startswith("/api/"):
            parts = path[len("/api/"):].split("/")
            if parts:
                module = parts[0]
        if not module:
            return None
        # Determine action
        if request.method == "GET":
            action = "view"
        elif request.method in ("POST", "PUT", "PATCH"):
            action = "edit"
        elif request.method == "DELETE":
            action = "delete"
        else:
            action = "view"
        # Check permission via RolePermission
        allowed = tenant_role.role.role_permissions.filter(
            permission__module=module,
            permission__action=action,
            allowed=True,
        ).exists()
        if not allowed:
            return JsonResponse({"detail": "Permission denied"}, status=403)
        return None
