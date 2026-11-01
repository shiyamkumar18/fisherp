from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import SupportTicket, TicketMessage
from .serializers import SupportTicketSerializer
from saas_platform.accounts.permissions import IsPlatformOperatorOrReadOnlySupport


class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing support tickets.
    Tenants can only see their own tickets.
    Platform Operators/Support can see all tickets.
    """
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SupportTicket.objects.none()
        
        if getattr(user, 'is_platform_user', False):
            qs = SupportTicket.objects.select_related('tenant', 'creator', 'assignee').prefetch_related('messages').all()
        elif getattr(user, 'is_tenant_user', False):
            qs = SupportTicket.objects.filter(tenant=user.company).prefetch_related('messages')
            
        # Filters
        status_filter = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        category = self.request.query_params.get('category')
        is_escalated = self.request.query_params.get('is_escalated')
        search = self.request.query_params.get('search')
        
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority:
            qs = qs.filter(priority=priority)
        if category:
            qs = qs.filter(category=category)
        if is_escalated == 'true':
            qs = qs.filter(is_escalated=True)
            
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(subject__icontains=search) | 
                Q(ticket_number__icontains=search) |
                Q(tenant__name__icontains=search) |
                Q(creator__email__icontains=search) |
                Q(creator__username__icontains=search)
            )
            
        return qs

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def war_room_metrics(self, request):
        if getattr(request.user, 'is_tenant_user', False):
            return Response({'error': 'Unauthorized'}, status=403)
            
        qs = self.get_queryset()
        now = timezone.now()
        
        open_qs = qs.exclude(status__in=['resolved', 'closed'])
        breached_count = open_qs.filter(sla_resolution_at__lt=now).count()
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        agents = User.objects.filter(role__startswith='platform_support').values('id', 'username', 'role')
        
        agent_data = []
        for a in agents:
            count = open_qs.filter(assignee_id=a['id']).count()
            workload = min(100, count * 10)
            
            raw_role = a['role']
            if raw_role == 'platform_support_l1':
                fmt_role = 'SUPPORT L1'
            elif raw_role == 'platform_support_l2':
                fmt_role = 'SUPPORT L2'
            elif raw_role == 'platform_support_manager':
                fmt_role = 'SUPPORT L3'
            else:
                fmt_role = 'SUPPORT L2'
                
            agent_data.append({
                'id': a['id'],
                'name': a['username'],
                'role': fmt_role,
                'status': 'online',
                'workload': workload,
                'activeTickets': count,
                'slaScore': 98 # Mock SLA adherence
            })
            
        metrics = {
            'open_tickets': open_qs.count(),
            'breached_tickets': breached_count,
            'escalated_tickets': qs.filter(is_escalated=True).exclude(status__in=['resolved', 'closed']).count(),
            'critical_tickets': open_qs.filter(priority='critical').count(),
            'active_agents': len(agent_data),
            'agents': agent_data,
            'avg_response_time_mins': 45, # Mock value
            'avg_resolution_time_hrs': 12, # Mock value
            'csat_score': 94 # Mock value
        }
        return Response(metrics)

    def perform_create(self, serializer):
        user = self.request.user
        
        # Calculate SLAs based on priority
        priority = serializer.validated_data.get('priority', 'medium')
        now = timezone.now()
        
        if priority == 'critical':
            sla_response = now + timezone.timedelta(minutes=30)
            sla_resolution = now + timezone.timedelta(hours=4)
        elif priority == 'high':
            sla_response = now + timezone.timedelta(hours=2)
            sla_resolution = now + timezone.timedelta(hours=12)
        elif priority == 'medium':
            sla_response = now + timezone.timedelta(hours=12)
            sla_resolution = now + timezone.timedelta(hours=48)
        else:
            sla_response = now + timezone.timedelta(hours=24)
            sla_resolution = now + timezone.timedelta(days=5)

        # Extended Metadata & Impact Flags
        request_data = self.request.data
        tenant_environment = {
            'role': user.role,
            'is_tenant_user': getattr(user, 'is_tenant_user', False),
            'environment': request_data.get('environment', 'Production'),
            'impacted_users': request_data.get('impacted_users', 'Unknown'),
            'browser_info': self.request.META.get('HTTP_USER_AGENT', 'Unknown'),
            # Enterprise Impact Flags
            'source': request_data.get('source', 'Web Portal'),
            'channel': request_data.get('channel', 'Support UI'),
            'bug_reproducible': request_data.get('bug_reproducible', False),
            'production_impact': request_data.get('production_impact', False),
            'financial_impact': request_data.get('financial_impact', False),
            'voice_failure': request_data.get('voice_failure', False),
            'branch_impact': request_data.get('branch_impact', False),
            'order_impact': request_data.get('order_impact', False),
            'inventory_impact': request_data.get('inventory_impact', False),
            'payment_impact': request_data.get('payment_impact', False),
        }
        
        assigned_to_id = request_data.get('assignee_id')
        severity = serializer.validated_data.get('severity', 'medium')
        category = serializer.validated_data.get('category', 'technical')
        
        # SMART AUTO LOGIC (Assignment & Escalation)
        is_escalated = False
        escalation_level = 0
        status = 'new'
        
        if not assigned_to_id and getattr(user, 'is_tenant_user', False):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if category == 'billing':
                auto_agent = User.objects.filter(role='platform_billing_admin', is_platform_user=True).first()
                if auto_agent:
                    assigned_to_id = auto_agent.id
            elif category == 'technical':
                auto_agent = User.objects.filter(role='platform_support_l2', is_platform_user=True).first()
                if auto_agent:
                    assigned_to_id = auto_agent.id
                    
        if priority == 'critical' or severity == 'critical':
            is_escalated = True
            escalation_level = 3
            status = 'escalated_l3'
            
        save_draft = request_data.get('save_draft', False)
        
        save_kwargs = {
            'creator': user,
            'sla_response_at': sla_response,
            'sla_resolution_at': sla_resolution,
            'tenant_environment': tenant_environment,
        }
        
        if getattr(user, 'is_tenant_user', False):
            save_kwargs['tenant'] = user.company
            
        if assigned_to_id and getattr(user, 'is_platform_user', False):
            save_kwargs['assignee_id'] = assigned_to_id
            if status == 'new':
                status = 'assigned'
                
        # Support "Draft" state via status or a tag
        if save_draft:
            # Reusing "new" but adding a tag for UI to interpret as draft
            tags = serializer.validated_data.get('tags', [])
            if 'draft' not in tags:
                tags.append('draft')
            save_kwargs['tags'] = tags
            status = 'new'
            
        save_kwargs['status'] = status
        save_kwargs['is_escalated'] = is_escalated
        save_kwargs['escalation_level'] = escalation_level
            
        serializer.save(**save_kwargs)

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

        # Stamp first_response_at if this is the first platform reply
        if getattr(request.user, 'is_platform_user', False) and not ticket.first_response_at:
            ticket.first_response_at = timezone.now()
            ticket.save(update_fields=['first_response_at'])

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
        if ticket.status in ['new', 'open']:
            ticket.status = 'assigned'
        ticket.save()
        
        # Retrieve username for log if possible
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            assignee = User.objects.get(id=assignee_id)
            assignee_name = assignee.username
        except:
            assignee_name = f"User ID {assignee_id}"

        TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            content=f"Ticket assigned to {assignee_name} by {request.user.username}.",
            is_internal=True
        )

        return Response({'message': 'Ticket assigned successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[IsPlatformOperatorOrReadOnlySupport])
    def escalate(self, request, pk=None):
        ticket = self.get_object()
        reason = request.data.get('reason')
        priority = request.data.get('priority', ticket.priority)
        impact = request.data.get('impact', ticket.severity)
        
        if not reason:
            return Response({'error': 'A reason is required to escalate.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.is_escalated = True
        ticket.escalation_level += 1
        
        if ticket.escalation_level == 1:
            ticket.status = 'escalated_l1'
        elif ticket.escalation_level == 2:
            ticket.status = 'escalated_l2'
        else:
            ticket.status = 'escalated_l3'
            
        ticket.priority = priority
        ticket.severity = impact
        ticket.save()

        TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            content=f"ESCALATED to Level {ticket.escalation_level}. Priority: {priority}, Impact: {impact}. Reason: {reason}",
            is_internal=True
        )

        return Response({'message': 'Ticket escalated successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[IsPlatformOperatorOrReadOnlySupport])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        reason = request.data.get('reason')
        if not reason:
            return Response({'error': 'A resolution note is required to resolve a ticket.'}, status=status.HTTP_400_BAD_REQUEST)
            
        ticket.status = 'resolved'
        ticket.resolved_at = timezone.now()
        ticket.save()
        
        TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            content=f"RESOLVED: {reason}",
            is_internal=False
        )
        return Response({'message': 'Ticket resolved.'})
        
    @action(detail=True, methods=['post'], permission_classes=[IsPlatformOperatorOrReadOnlySupport])
    def close(self, request, pk=None):
        ticket = self.get_object()
        if ticket.status != 'resolved':
            return Response({'error': 'Ticket must be resolved before closing.'}, status=status.HTTP_400_BAD_REQUEST)
            
        ticket.status = 'closed'
        ticket.closed_at = timezone.now()
        ticket.save()
        
        TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            content=f"Ticket permanently CLOSED.",
            is_internal=True
        )
        return Response({'message': 'Ticket closed.'})

    @action(detail=True, methods=['post'], permission_classes=[IsPlatformOperatorOrReadOnlySupport])
    def impersonate(self, request, pk=None):
        """Impersonation flow triggered from a support ticket by an L2/Manager."""
        ticket = self.get_object()
        reason = request.data.get('reason')
        
        if not reason:
            return Response({'error': 'A justification reason is required to start impersonation.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from saas_platform.accounts.models_audit import ImpersonationLog
        
        # End any active impersonation for this platform user
        ImpersonationLog.objects.filter(
            platform_user=request.user, 
            is_active=True
        ).update(is_active=False, end_time=timezone.now())

        # Start new impersonation
        log = ImpersonationLog.objects.log_impersonation_start(
            platform_user=request.user,
            tenant=ticket.tenant,
            reason=f"Ticket {ticket.id}: {reason}"
        )
        
        # Link to ticket
        ticket.linked_impersonation = log
        ticket.save(update_fields=['linked_impersonation'])
        
        TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            content=f"IMPERSONATION SESSION STARTED. Reason: {reason}",
            is_internal=True
        )
        
        return Response({'message': 'Impersonation approved and logged. You are now acting as the tenant.', 'impersonation_id': log.id})
