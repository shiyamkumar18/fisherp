from rest_framework import serializers
from .models import (
    Branch, OrganizationDepartment, Shift, OrganizationRole,
    StaffProfile, ApprovalWorkflow, ApprovalRecord, AccessPolicy
)
from django.contrib.auth import get_user_model

User = get_user_model()


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'address', 'contact_phone', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrganizationDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationDepartment
        fields = ['id', 'name', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ['id', 'name', 'start_time', 'end_time', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrganizationRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationRole
        fields = ['id', 'name', 'description', 'base_role_mapping', 'permissions', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'role', 'is_active']
        read_only_fields = ['id']


class StaffProfileSerializer(serializers.ModelSerializer):
    user = UserNestedSerializer(read_only=True)
    
    # We allow writing to these fields during creation/update via custom methods
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True, required=False
    )
    
    branch_detail = BranchSerializer(source='branch', read_only=True)
    department_detail = OrganizationDepartmentSerializer(source='department', read_only=True)
    shift_detail = ShiftSerializer(source='shift', read_only=True)
    role_detail = OrganizationRoleSerializer(source='organization_role', read_only=True)
    
    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user', 'user_id', 
            'branch', 'branch_detail', 
            'department', 'department_detail', 
            'shift', 'shift_detail', 
            'organization_role', 'role_detail',
            'manager', 'status', 'temporary_access_until', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ApprovalWorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalWorkflow
        fields = ['id', 'module', 'action', 'threshold_amount', 'required_roles', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class ApprovalRecordSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source='requester.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    
    class Meta:
        model = ApprovalRecord
        fields = [
            'id', 'workflow', 'requester', 'requester_name', 
            'content_type', 'object_id', 'status', 
            'approved_by', 'approved_by_name', 'comments', 'created_at'
        ]
        read_only_fields = ['id', 'requester', 'created_at']


class AccessPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessPolicy
        fields = ['id', 'name', 'policy_type', 'configuration', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
