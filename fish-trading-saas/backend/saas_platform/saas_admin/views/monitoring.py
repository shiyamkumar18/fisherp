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

from saas_platform.accounts.permissions import IsPlatformOperator, CanUseImpersonation, IsPlatformOperatorOrReadOnlySupport
from saas_platform.accounts.models_audit import AuditLog, ImpersonationLog, get_client_ip
from saas_platform.companies.models import Company
from saas_platform.subscriptions.models import Subscription, SubscriptionTier
from saas_platform.support.models import SupportTicket

User = get_user_model()


class AuditLogListView(APIView):
    """
    List platform audit logs.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        action_filter = request.query_params.get('action', 'all')
        
        logs = AuditLog.objects.select_related('user', 'tenant').order_by('-timestamp')
        
        if action_filter != 'all':
            logs = logs.filter(action=action_filter)
        
        paginator = Paginator(logs, page_size)
        page_obj = paginator.get_page(page)
        
        return Response({
            'logs': [
                {
                    'id': getattr(log, 'id', None),
                    'user': getattr(log.user, 'username', 'System') if log.user else 'System',
                    'tenant': getattr(log.tenant, 'name', None) if log.tenant else None,
                    'action': log.action,
                    'model_name': log.model_name,
                    'object_id': log.object_id,
                    'ip_address': log.ip_address,
                    'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                    'is_impersonation': log.is_impersonation,
                }
                for log in page_obj
            ],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
            }
        })


class ImpersonationLogListView(APIView):
    """
    List impersonation logs.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        logs = ImpersonationLog.objects.select_related(
            'platform_user', 'tenant'
        ).order_by('-start_time')
        
        paginator = Paginator(logs, page_size)
        page_obj = paginator.get_page(page)
        
        return Response({
            'logs': [
                {
                    'id': getattr(log, 'id', None),
                    'platform_user': getattr(log.platform_user, 'username', 'Unknown') if log.platform_user else 'Unknown',
                    'tenant': {
                        'id': getattr(log.tenant, 'id', None) if log.tenant else None,
                        'name': getattr(log.tenant, 'name', 'Unknown') if log.tenant else 'Unknown',
                        'slug': getattr(log.tenant, 'slug', '') if log.tenant else '',
                    },
                    'reason': log.reason,
                    'start_time': log.start_time.isoformat() if log.start_time else None,
                    'end_time': log.end_time.isoformat() if log.end_time else None,
                    'is_active': log.is_active,
                    'duration': log.duration_display,
                    'ip_address': log.ip_address,
                }
                for log in page_obj
            ],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
            }
        })


class PlatformActivityView(APIView):
    """
    View platform operator activity.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        operator_id = request.query_params.get('operator_id')
        
        # Get activity for specific operator or all
        if operator_id:
            logs = AuditLog.objects.filter(
                user_id=operator_id
            ).order_by('-timestamp')[:50]
        else:
            logs = AuditLog.objects.filter(
                user__role='platform_operator'
            ).order_by('-timestamp')[:50]
        
        return Response({
            'activity': [
                {
                    'id': getattr(log, 'id', None),
                    'user': getattr(log.user, 'username', 'System') if log.user else 'System',
                    'action': log.action,
                    'model_name': log.model_name,
                    'tenant': getattr(log.tenant, 'name', None) if log.tenant else None,
                    'ip_address': log.ip_address,
                    'timestamp': log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in logs
            ]
        })


class SystemHealthView(APIView):
    """
    System health and monitoring metrics.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)
        one_day_ago = now - timedelta(days=1)
        
        # Login activity (last hour)
        logins_last_hour = AuditLog.objects.filter(
            action='login',
            timestamp__gte=one_hour_ago
        ).count()
        
        # Total actions last hour
        actions_last_hour = AuditLog.objects.filter(
            timestamp__gte=one_hour_ago
        ).count()
        
        # Active sessions (approximation from recent logs)
        active_users = AuditLog.objects.filter(
            timestamp__gte=one_day_ago
        ).values('user').distinct().count()
        
        # Error rate (last 24 hours)
        total_actions_24h = AuditLog.objects.filter(
            timestamp__gte=one_day_ago
        ).count()
        
        error_actions = AuditLog.objects.filter(
            timestamp__gte=one_day_ago,
            action__in=['permission_denied', 'failed_login']
        ).count()
        
        error_rate = (error_actions / total_actions_24h * 100) if total_actions_24h > 0 else 0
        
        return Response({
            'timestamp': now.isoformat(),
            'metrics': {
                'logins_last_hour': logins_last_hour,
                'actions_last_hour': actions_last_hour,
                'active_users_24h': active_users,
                'error_rate_24h': round(error_rate, 2),
            },
            'system': {
                'total_tenants': Company.objects.count(),
                'total_users': User.objects.count(),
                'total_subscriptions': Subscription.objects.count(),
                'active_subscriptions': Subscription.objects.filter(status='active').count(),
            }
        })


# =====================================================
# 8. PLATFORM TIER MANAGEMENT
# =====================================================

