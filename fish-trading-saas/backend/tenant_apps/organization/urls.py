from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BranchViewSet, OrganizationDepartmentViewSet, ShiftViewSet,
    OrganizationRoleViewSet, StaffProfileViewSet, ApprovalWorkflowViewSet,
    ApprovalRecordViewSet, AccessPolicyViewSet
)

router = DefaultRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'departments', OrganizationDepartmentViewSet, basename='department')
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'roles', OrganizationRoleViewSet, basename='organization-role')
router.register(r'staff', StaffProfileViewSet, basename='staff')
router.register(r'approval-workflows', ApprovalWorkflowViewSet, basename='approval-workflow')
router.register(r'approval-records', ApprovalRecordViewSet, basename='approval-record')
router.register(r'access-policies', AccessPolicyViewSet, basename='access-policy')

urlpatterns = [
    path('', include(router.urls)),
]
