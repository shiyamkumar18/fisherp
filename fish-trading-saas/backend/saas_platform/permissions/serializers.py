from rest_framework import serializers
from .models import Role, Permission, RolePermission, TenantRole

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ("id", "module", "action")

class RolePermissionSerializer(serializers.ModelSerializer):
    permission = PermissionSerializer(read_only=True)

    class Meta:
        model = RolePermission
        fields = ("id", "allowed", "permission")

class RoleSerializer(serializers.ModelSerializer):
    role_permissions = RolePermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Role
        fields = ("id", "name", "description", "is_system_admin", "role_permissions")

class TenantRoleSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)

    class Meta:
        model = TenantRole
        fields = ("id", "tenant", "role")
