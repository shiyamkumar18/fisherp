from django.db import models
from django.conf import settings

class Permission(models.Model):
    """A specific action on a module (e.g., 'view' on 'sales')."""

    class Action(models.TextChoices):
        VIEW = "view", "View"
        CREATE = "create", "Create"
        EDIT = "edit", "Edit"
        DELETE = "delete", "Delete"
        APPROVE = "approve", "Approve"
        EXPORT = "export", "Export"
        PRINT = "print", "Print"
        FINANCIAL_ACCESS = "financial_access", "Financial Access"
        SETTINGS_ACCESS = "settings_access", "Settings Access"
        ADMIN_OVERRIDE = "admin_override", "Admin Override"

    module = models.CharField(max_length=100)
    action = models.CharField(max_length=30, choices=Action.choices)

    class Meta:
        unique_together = ("module", "action")
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"

    def __str__(self):
        return f"{self.module}:{self.action}"

class Role(models.Model):
    """A role within a tenant (e.g., Accountant, Branch Manager)."""

    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_system_admin = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class RolePermission(models.Model):
    """Link a Role to a Permission with an allowed flag."""

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    allowed = models.BooleanField(default=False)

    class Meta:
        unique_together = ("role", "permission")
        verbose_name = "Role Permission"
        verbose_name_plural = "Role Permissions"

    def __str__(self):
        return f"{self.role} - {self.permission} = {self.allowed}"

class TenantRole(models.Model):
    """Assign a Role to a specific Tenant, optionally overriding permissions."""

    tenant = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="tenant_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="tenant_roles")
    # Overrides are stored as many‑to‑many through RolePermission; we reuse the same model.
    # Custom overrides can be managed via admin or API.

    class Meta:
        unique_together = ("tenant", "role")
        verbose_name = "Tenant Role"
        verbose_name_plural = "Tenant Roles"

    def __str__(self):
        return f"{self.tenant.name} - {self.role.name}"
