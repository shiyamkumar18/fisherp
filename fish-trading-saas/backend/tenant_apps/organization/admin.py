from django.contrib import admin
from .models import (
    Branch, OrganizationDepartment, Shift, OrganizationRole,
    StaffProfile, ApprovalWorkflow, ApprovalRecord, AccessPolicy
)

admin.site.register(Branch)
admin.site.register(OrganizationDepartment)
admin.site.register(Shift)
admin.site.register(OrganizationRole)
admin.site.register(StaffProfile)
admin.site.register(ApprovalWorkflow)
admin.site.register(ApprovalRecord)
admin.site.register(AccessPolicy)
