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


class SubscriptionTierManagementView(APIView):
    """
    Manage subscription tiers (CRUD).
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        """List all tiers"""
        tiers = SubscriptionTier.objects.all().order_by('display_order')
        
        return Response({
            'tiers': [
                {
                    'id': getattr(tier, 'id', None),
                    'name': tier.name,
                    'description': tier.description,
                    'max_users': tier.max_users,
                    'max_storage_gb': tier.max_storage_gb,
                    'price_monthly': str(tier.price_monthly),
                    'price_yearly': str(tier.price_yearly),
                    'is_active': tier.is_active,
                    'display_order': tier.display_order,
                    'is_recommended': tier.is_recommended,
                    'trial_days': tier.trial_days,
                    'feature_count': len(tier.get_features_list()),
                }
                for tier in tiers
            ]
        })
    
    def post(self, request):
        """Create new tier"""
        name = request.data.get('name')
        
        if not name:
            return Response(
                {'error': 'Name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if SubscriptionTier.objects.filter(name=name).exists():
            return Response(
                {'error': 'Tier with this name already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tier = SubscriptionTier.objects.create(
            name=name,
            description=request.data.get('description', ''),
            max_users=request.data.get('max_users', 1),
            max_storage_gb=request.data.get('max_storage_gb', 5),
            price_monthly=request.data.get('price_monthly', 0),
            price_yearly=request.data.get('price_yearly', 0),
            is_active=request.data.get('is_active', True),
            display_order=request.data.get('display_order', 0),
        )
        
        AuditLog.log_create(
            user=request.user,
            model_name='SubscriptionTier',
            object_id=getattr(tier, 'id', None),
            object_repr=f"Subscription tier: {tier.name}",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': f'Tier "{name}" created successfully',
            'tier': {
                'id': getattr(tier, 'id', None),
                'name': tier.name,
            }
        }, status=status.HTTP_201_CREATED)


class SubscriptionTierDetailView(APIView):
    """
    Manage individual subscription tier.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request, tier_id):
        try:
            tier = SubscriptionTier.objects.get(id=tier_id)
        except SubscriptionTier.DoesNotExist:
            return Response(
                {'error': 'Tier not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get subscription count
        subscription_count = Subscription.objects.filter(tier=tier).count()
        
        return Response({
            'id': getattr(tier, 'id', None),
            'name': tier.name,
            'description': tier.description,
            'max_users': tier.max_users,
            'max_storage_gb': tier.max_storage_gb,
            'price_monthly': str(tier.price_monthly),
            'price_yearly': str(tier.price_yearly),
            'is_active': tier.is_active,
            'display_order': tier.display_order,
            'is_recommended': tier.is_recommended,
            'trial_days': tier.trial_days,
            'subscription_count': subscription_count,
            'features': tier.get_features_list(),
        })
    
    def patch(self, request, tier_id):
        """Update tier"""
        try:
            tier = SubscriptionTier.objects.get(id=tier_id)
        except SubscriptionTier.DoesNotExist:
            return Response(
                {'error': 'Tier not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        allowed_fields = [
            'description', 'max_users', 'max_storage_gb',
            'price_monthly', 'price_yearly', 'is_active',
            'display_order', 'is_recommended', 'trial_days'
        ]
        
        changes = {}
        for field in allowed_fields:
            if field in request.data:
                old_value = getattr(tier, field)
                new_value = request.data[field]
                setattr(tier, field, new_value)
                changes[field] = f"{old_value} -> {new_value}"
        
        tier.save()
        
        AuditLog.log_update(
            user=request.user,
            model_name='SubscriptionTier',
            object_id=getattr(tier, 'id', None),
            object_repr=f"Subscription tier: {tier.name}",
            changes=changes,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Tier updated successfully',
            'tier': {
                'id': getattr(tier, 'id', None),
                'name': tier.name,
            }
        })


# =====================================================
# 9. EXTRA TOOLS - Advanced Platform Management
# =====================================================

class TenantActivityHeatmapView(APIView):
    """
    Show tenant activity heatmap - when tenants are most active.
    
    Returns activity counts grouped by hour of day and day of week.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        # Get last 30 days of data
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get audit logs for tenant activities
        logs = AuditLog.objects.filter(
            timestamp__gte=thirty_days_ago
        ).annotate(
            hour=ExtractHour('timestamp'),
            day=ExtractWeekDay('timestamp')
        ).values('hour', 'day').annotate(
            count=Count('id')
        )
        
        # Build heatmap data
        # ExtractWeekDay returns 1 (Sunday) – 7 (Saturday); normalize to 0–6
        # to match the original PostgreSQL EXTRACT(DOW ...) convention (0=Sunday).
        heatmap = {}
        for log in logs:
            hour = int(log['hour'])
            day = int(log['day']) - 1  # convert 1-7 → 0-6
            if hour not in heatmap:
                heatmap[hour] = {}
            heatmap[hour][day] = log['count']
        
        # Get most active tenants
        top_tenants = AuditLog.objects.filter(
            timestamp__gte=thirty_days_ago,
            tenant__isnull=False
        ).values('tenant__name').annotate(
            activity_count=Count('id')
        ).order_by('-activity_count')[:10]
        
        return Response({
            'heatmap': heatmap,
            'top_tenants': list(top_tenants),
            'period': 'last_30_days'
        })


class BillingHistoryView(APIView):
    """
    View complete billing history across all tenants.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        
        # Get subscriptions with payment history
        subscriptions = Subscription.objects.select_related(
            'tenant', 'tier'
        ).order_by('-last_payment_date')
        
        # Filter to those with payment history
        subscriptions = subscriptions.exclude(
            Q(last_payment_date__isnull=True) | Q(last_payment_date__exact=None)
        )
        
        paginator = Paginator(subscriptions, page_size)
        page_obj = paginator.get_page(page)
        
        billing_history = []
        for sub in page_obj:
            tenant_name = 'Unknown'
            try:
                if sub.tenant and sub.tenant.company:
                    tenant_name = sub.tenant.company.name
            except (AttributeError, ObjectDoesNotExist):
                pass

            billing_history.append({
                'id': getattr(sub, 'id', None),
                'tenant_name': tenant_name,
                'tier': getattr(sub.tier, 'name', 'None') if sub.tier else 'None',
                'last_payment_date': sub.last_payment_date.isoformat() if sub.last_payment_date else None,
                'last_payment_amount': str(sub.last_payment_amount),
                'total_paid_till_date': str(sub.total_paid_till_date),
                'payment_method': sub.payment_method,
                'status': sub.status,
            })
        
        # Calculate total revenue
        total_revenue = sum(
            float(s.total_paid_till_date or 0) 
            for s in Subscription.objects.all()
        )
        
        return Response({
            'billing_history': billing_history,
            'total_revenue': total_revenue,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
            }
        })


class ErrorTrackingView(APIView):
    """
    Error tracking dashboard - view recent errors and exceptions.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        # Get recent permission denied and error events
        one_day_ago = timezone.now() - timedelta(days=1)
        seven_days_ago = timezone.now() - timedelta(days=7)
        
        # Permission denied events
        permission_denied = AuditLog.objects.filter(
            action='permission_denied',
            timestamp__gte=one_day_ago
        ).values('user__username', 'model_name', 'error_message', 'ip_address', 'timestamp')
        
        # Failed logins
        failed_logins = AuditLog.objects.filter(
            action='failed_login',
            timestamp__gte=seven_days_ago
        ).values('ip_address', 'timestamp', 'error_message').order_by('-timestamp')[:20]
        
        # Error rate
        total_actions = AuditLog.objects.filter(
            timestamp__gte=seven_days_ago
        ).count()
        
        errors = AuditLog.objects.filter(
            action__in=['permission_denied', 'failed_login'],
            timestamp__gte=seven_days_ago
        ).count()
        
        error_rate = (errors / total_actions * 100) if total_actions > 0 else 0
        
        return Response({
            'permission_denied_today': list(permission_denied),
            'failed_logins_last_7_days': list(failed_logins),
            'error_rate_7_days': round(error_rate, 2),
            'total_errors_7_days': errors,
        })


class BackupStatusView(APIView):
    """
    Database backup status view.
    
    In production, this would connect to actual backup systems.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        # Simulated backup status (in production, connect to actual backup system)
        # Get last audit log timestamp as proxy for data freshness
        last_activity = AuditLog.objects.order_by('-timestamp').first()
        
        if last_activity:
            last_activity_time = last_activity.timestamp
        else:
            last_activity_time = timezone.now()
        
        return Response({
            'status': 'healthy',
            'last_backup': (timezone.now() - timedelta(hours=2)).isoformat(),
            'next_scheduled_backup': (timezone.now() + timedelta(hours=22)).isoformat(),
            'backup_count': 30,
            'total_size_mb': 1024.5,
            'last_activity': last_activity_time.isoformat(),
            'retention_days': 30,
            'note': 'This is a simulated backup status. In production, connect to actual backup system.'
        })
