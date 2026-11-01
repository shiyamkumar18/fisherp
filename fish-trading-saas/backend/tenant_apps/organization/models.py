from django.db import models
from django.contrib.auth import get_user_model
from saas_platform.companies.models import Company

User = get_user_model()


class TenantModel(models.Model):
    """Abstract base model ensuring tenant isolation."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="%(class)ss")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Branch(TenantModel):
    """Physical branch locations of the tenant."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class OrganizationDepartment(TenantModel):
    """Departments inside a tenant organization (e.g., Sales, Procurement)."""
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.company.name}"


class Shift(TenantModel):
    """Work shifts (e.g., Morning, Night)."""
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.start_time} - {self.end_time})"


class OrganizationRole(TenantModel):
    """Custom Enterprise roles with specific granular module access."""
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    # E.g., 'sales_staff', 'accountant' to map back to basic RBAC if needed
    base_role_mapping = models.CharField(max_length=100, blank=True, null=True)
    
    # Store explicit permissions
    permissions = models.JSONField(default=dict, help_text="Structured permission definition")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.company.name}"


class StaffProfile(TenantModel):
    """Extended profile for Users containing organizational structure details."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff")
    department = models.ForeignKey(OrganizationDepartment, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff")
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff")
    organization_role = models.ForeignKey(OrganizationRole, on_delete=models.SET_NULL, null=True, blank=True, related_name="staff")
    
    # Self-referencing FK for reporting hierarchy
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name="subordinates")
    
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('on_leave', 'On Leave'), ('suspended', 'Suspended')], default='active')
    temporary_access_until = models.DateTimeField(null=True, blank=True, help_text="Revoke access after this timestamp")

    def __str__(self):
        return f"{self.user.username} Profile"


class ApprovalWorkflow(TenantModel):
    """Rules defining when approvals are required."""
    module = models.CharField(max_length=100, help_text="e.g. 'purchase', 'payment', 'sales'")
    action = models.CharField(max_length=100, help_text="e.g. 'create', 'edit'")
    threshold_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # In a fully fleshed out system, this might be M2M to OrganizationRole.
    # For simplicity, we can store role strings or FK to OrganizationRole.
    required_roles = models.JSONField(default=list, help_text="List of role strings or IDs required to approve")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Workflow: {self.module} {self.action} for {self.company.name}"


class ApprovalRecord(TenantModel):
    """Tracks a specific approval request against an object."""
    workflow = models.ForeignKey(ApprovalWorkflow, on_delete=models.CASCADE, related_name="records")
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name="requested_approvals")
    
    # Generic relation to target object
    content_type = models.CharField(max_length=100) # e.g. 'business.PurchaseBatch'
    object_id = models.CharField(max_length=100)
    
    status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending')
    
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="granted_approvals")
    comments = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Approval for {self.content_type} {self.object_id} ({self.status})"


class AccessPolicy(TenantModel):
    """Higher-level access restrictions."""
    name = models.CharField(max_length=150)
    # E.g. restricting access outside shift times, or IP whitelisting
    policy_type = models.CharField(max_length=50, choices=[('ip_whitelist', 'IP Whitelist'), ('time_restricted', 'Time Restricted')])
    configuration = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.company.name}"
