from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.filters import BaseFilterBackend

from .models import (
    Branch, OrganizationDepartment, Shift, OrganizationRole,
    StaffProfile, ApprovalWorkflow, ApprovalRecord, AccessPolicy
)
from .serializers import (
    BranchSerializer, OrganizationDepartmentSerializer, ShiftSerializer,
    OrganizationRoleSerializer, StaffProfileSerializer, ApprovalWorkflowSerializer,
    ApprovalRecordSerializer, AccessPolicySerializer
)

User = get_user_model()


class TenantFilterBackend(BaseFilterBackend):
    """Filter queryset to only show objects belonging to the user's company."""
    def filter_queryset(self, request, queryset, view):
        if getattr(request.user, 'is_platform_user', False):
            return queryset
        return queryset.filter(company=request.user.company)


class BaseTenantViewSet(viewsets.ModelViewSet):
    """Base ViewSet that automatically filters by tenant and assigns company on save."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [TenantFilterBackend]
    
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class BranchViewSet(BaseTenantViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer


class OrganizationDepartmentViewSet(BaseTenantViewSet):
    queryset = OrganizationDepartment.objects.all()
    serializer_class = OrganizationDepartmentSerializer


class ShiftViewSet(BaseTenantViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer


class OrganizationRoleViewSet(BaseTenantViewSet):
    queryset = OrganizationRole.objects.all()
    serializer_class = OrganizationRoleSerializer


class StaffProfileViewSet(BaseTenantViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a staff member and their associated User account."""
        profile = self.get_object()
        
        with transaction.atomic():
            profile.status = 'suspended'
            profile.save()
            
            user = profile.user
            user.is_active = False
            user.save()
            
        return Response({'status': 'staff deactivated'}, status=status.HTTP_200_OK)
        
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset the user's password (requires proper admin permissions in real app)."""
        profile = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = profile.user
        user.set_password(new_password)
        user.save()
        return Response({'status': 'password reset successful'}, status=status.HTTP_200_OK)


class ApprovalWorkflowViewSet(BaseTenantViewSet):
    queryset = ApprovalWorkflow.objects.all()
    serializer_class = ApprovalWorkflowSerializer


class ApprovalRecordViewSet(BaseTenantViewSet):
    queryset = ApprovalRecord.objects.all()
    serializer_class = ApprovalRecordSerializer

    def perform_create(self, serializer):
        serializer.save(
            company=self.request.user.company,
            requester=self.request.user
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending record."""
        record = self.get_object()
        if record.status != 'pending':
            return Response({'error': 'Record is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Here we would normally check if request.user has required_roles
        record.status = 'approved'
        record.approved_by = request.user
        record.comments = request.data.get('comments', '')
        record.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending record."""
        record = self.get_object()
        if record.status != 'pending':
            return Response({'error': 'Record is not pending.'}, status=status.HTTP_400_BAD_REQUEST)
            
        record.status = 'rejected'
        record.approved_by = request.user
        record.comments = request.data.get('comments', '')
        record.save()
        return Response({'status': 'rejected'})


class AccessPolicyViewSet(BaseTenantViewSet):
    queryset = AccessPolicy.objects.all()
    serializer_class = AccessPolicySerializer
