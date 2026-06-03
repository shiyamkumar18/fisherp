from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import SupportTicket, TicketMessage
from accounts.permissions import IsPlatformOperatorOrReadOnlySupport


class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing support tickets.
    Tenants can only see their own tickets.
    Platform Operators/Support can see all tickets.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_platform_user', False):
            return SupportTicket.objects.select_related('tenant', 'creator', 'assignee').all()
        elif getattr(user, 'is_tenant_user', False):
            return SupportTicket.objects.filter(tenant=user.company)
        return SupportTicket.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, 'is_tenant_user', False):
            serializer.save(creator=user, tenant=user.company)
        else:
            # If a platform user creates a ticket on behalf of a tenant,
            # they must specify the tenant. We assume the serializer handles this
            # if passed correctly, but typically tenants create tickets.
            serializer.save(creator=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_message(self, request, pk=None):
        ticket = self.get_object()
        content = request.data.get('content')
        is_internal = request.data.get('is_internal', False)

        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Only platform users can create internal notes
        if is_internal and not getattr(request.user, 'is_platform_user', False):
            return Response({'error': 'Only platform staff can add internal notes.'}, status=status.HTTP_403_FORBIDDEN)

        message = TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            content=content,
            is_internal=is_internal
        )

        return Response({
            'id': message.id,
            'content': message.content,
            'is_internal': message.is_internal,
            'author': message.author.username,
            'created_at': message.created_at
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsPlatformOperatorOrReadOnlySupport])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        assignee_id = request.data.get('assignee_id')

        if not assignee_id:
            return Response({'error': 'assignee_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.assignee_id = assignee_id
        if ticket.status == 'open':
            ticket.status = 'in_progress'
        ticket.save()

        return Response({'message': 'Ticket assigned successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[IsPlatformOperatorOrReadOnlySupport])
    def escalate(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = 'escalated'
        ticket.priority = 'high'
        ticket.save()

        # Optionally log an internal message about the escalation
        TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            content=f"Ticket escalated by {request.user.username}.",
            is_internal=True
        )

        return Response({'message': 'Ticket escalated successfully.'})
