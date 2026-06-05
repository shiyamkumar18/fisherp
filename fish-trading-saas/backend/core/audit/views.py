from rest_framework import viewsets, permissions
from .models import AuditLog
from .serializers import AuditLogSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for fetching Enterprise Audit Logs / Activity Timeline.
    Strictly isolated per tenant.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    filterset_fields = ['module', 'entity_type', 'entity_id', 'action', 'user', 'branch']
    search_fields = ['entity_label', 'reason', 'changed_fields']
    ordering_fields = ['performed_at']
    ordering = ['-performed_at']

    def get_queryset(self):
        # Strict tenant isolation
        return AuditLog.objects.filter(company=self.request.user.company)
