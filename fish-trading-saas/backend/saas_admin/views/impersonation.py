"""
Platform Manager Views
======================

Comprehensive platform-level management for SaaS operations.
Provides tenant management, subscription control, impersonation,
support tools, and audit logging.

Security:
- All views require platform_operator role
- Impersonation requires reason (logged)
- All actions are audit logged
- No business data visible without impersonation
"""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum, Q, Max
from django.db.models.functions import ExtractHour, ExtractWeekDay
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from decimal import Decimal
from datetime import timedelta
import secrets
import string

from accounts.permissions import IsPlatformOperator, CanUseImpersonation, IsPlatformOperatorOrReadOnlySupport
from accounts.models_audit import AuditLog, ImpersonationLog, get_client_ip
from companies.models import Company
from subscriptions.models import Subscription, SubscriptionTier
from support.models import SupportTicket

User = get_user_model()


class StartImpersonationView(APIView):
    """
    Start impersonation session for platform operator.
    
    SECURITY: Requires reason (logged), shows warning banner.
    """
    permission_classes = [permissions.IsAuthenticated, CanUseImpersonation]
    
    def post(self, request, tenant_id):
        reason = request.data.get('reason', '').strip()
        
        if not reason:
            return Response(
                {'error': 'Reason is required for impersonation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(reason) < 10:
            return Response(
                {'error': 'Reason must be at least 10 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already impersonating
        existing = ImpersonationLog.objects.filter(
            platform_user=request.user,
            is_active=True
        ).first()
        
        if existing:
            tenant_name = "Unknown"
            try:
                if existing.tenant:
                    tenant_name = existing.tenant.name
            except (AttributeError, ObjectDoesNotExist):
                pass

            return Response(
                {'error': f'Already impersonating {tenant_name}. End current session first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create impersonation log
        impersonation = ImpersonationLog.objects.create(
            platform_user=request.user,
            tenant=company,
            impersonated_user=getattr(company, 'admin', None),
            reason=reason,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            session_id=request.session.session_key or '',
            is_active=True,
        )
        
        # Log in audit
        AuditLog.log_impersonation_start(
            platform_user=request.user,
            tenant=company,
            reason=reason,
            ip_address=get_client_ip(request)
        )
        
        # Set session (for session-based auth)
        request.session['impersonating_tenant_id'] = getattr(company, 'id', None)
        request.session['impersonation_log_id'] = getattr(impersonation, 'id', None)
        request.session['impersonation_start_time'] = timezone.now().isoformat()
        request.session.save()
        
        return Response({
            'message': f'Impersonation started for {company.name}',
            'impersonation_id': getattr(impersonation, 'id', None),
            'tenant': {
                'id': getattr(company, 'id', None),
                'name': company.name,
                'slug': company.slug,
            },
            'started_at': impersonation.start_time.isoformat() if impersonation.start_time else None,
            'reason': reason,
            'warning': 'You are now viewing this tenant\'s data. All actions are logged.',
        })


class EndImpersonationView(APIView):
    """
    End impersonation session.
    """
    permission_classes = [permissions.IsAuthenticated, CanUseImpersonation]
    
    def post(self, request):
        # Find active impersonation
        impersonation = ImpersonationLog.objects.filter(
            platform_user=request.user,
            is_active=True
        ).first()
        
        if not impersonation:
            return Response(
                {'error': 'No active impersonation session'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        company = impersonation.tenant
        
        # End impersonation
        impersonation.end_impersonation()
        
        # Log end
        AuditLog.log_impersonation_end(
            platform_user=request.user,
            tenant=company,
            ip_address=get_client_ip(request)
        )
        
        # Clear session
        request.session.pop('impersonating_tenant_id', None)
        request.session.pop('impersonation_log_id', None)
        request.session.pop('impersonation_start_time', None)
        request.session.save()
        
        return Response({
            'message': f'Impersonation ended for {company.name}',
            'ended_at': impersonation.end_time.isoformat() if impersonation.end_time else None,
            'duration': impersonation.duration_display,
        })


class ImpersonationStatusView(APIView):
    """
    Check current impersonation status.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        impersonation = ImpersonationLog.objects.filter(
            platform_user=request.user,
            is_active=True
        ).first()
        
        if impersonation:
            tenant = impersonation.tenant
            return Response({
                'is_impersonating': True,
                'tenant': {
                    'id': getattr(tenant, 'id', None) if tenant else None,
                    'name': getattr(tenant, 'name', 'Unknown') if tenant else 'Unknown',
                    'slug': getattr(tenant, 'slug', '') if tenant else '',
                },
                'started_at': impersonation.start_time.isoformat() if impersonation.start_time else None,
                'reason': impersonation.reason,
                'duration': impersonation.duration_display,
            })
        
        return Response({
            'is_impersonating': False,
        })


class ActiveImpersonationsView(APIView):
    """
    List all active impersonations (for super admin).
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        impersonations = ImpersonationLog.objects.filter(
            is_active=True
        ).select_related('platform_user', 'tenant')
        
        return Response({
            'active_impersonations': [
                {
                    'id': getattr(imp, 'id', None),
                    'platform_user': getattr(imp.platform_user, 'username', 'Unknown') if imp.platform_user else 'Unknown',
                    'tenant': {
                        'id': getattr(imp.tenant, 'id', None) if imp.tenant else None,
                        'name': getattr(imp.tenant, 'name', 'Unknown') if imp.tenant else 'Unknown',
                        'slug': getattr(imp.tenant, 'slug', '') if imp.tenant else '',
                    },
                    'started_at': imp.start_time.isoformat() if imp.start_time else None,
                    'duration': imp.duration_display,
                    'reason': imp.reason,
                }
                for imp in impersonations
            ]
        })


