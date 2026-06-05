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


class SubscriptionManagementView(APIView):
    """
    Manage tenant subscriptions at platform level.
    
    Allows:
    - Change subscription tier
    - Extend expiry date
    - Grant temporary extension
    - View billing history
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        """List all subscriptions (paginated)"""
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 200)

        subscriptions = Subscription.objects.select_related(
            'company', 'tier'
        ).order_by('-expiry_date')

        paginator = Paginator(subscriptions, page_size)
        page_obj = paginator.get_page(page)

        sub_data = []
        for sub in page_obj:
            sub_data.append({
                'id': sub.id,
                'company': sub.company.name if sub.company else 'Unknown',
                'tier': sub.tier.name if sub.tier else 'Unknown',
                'status': sub.status,
                'start_date': sub.start_date,
                'expiry_date': sub.expiry_date,
                'auto_renewal': sub.auto_renewal,
            })
        
        return Response({
            'subscriptions': sub_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
            },
        })
    
    def post(self, request):
        """Create or update subscription"""
        tenant_id = request.data.get('tenant_id')
        tier_id = request.data.get('tier_id')
        action = request.data.get('action', 'upgrade')  # upgrade, downgrade, extend
        
        if not tenant_id or not tier_id:
            return Response(
                {'error': 'tenant_id and tier_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
            tier = SubscriptionTier.objects.get(id=tier_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except SubscriptionTier.DoesNotExist:
            return Response(
                {'error': 'Tier not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create subscription
        admin_user = getattr(company, 'admin', None)
        subscription, created = Subscription.objects.get_or_create(
            company=company,
            defaults={
                'tenant': admin_user,
                'tier': tier,
                'status': 'active',
                'start_date': timezone.now(),
                'expiry_date': timezone.now() + timedelta(days=30),
            }
        )
        
        if not created:
            old_tier = getattr(subscription.tier, 'name', 'Unknown') if subscription.tier else 'Unknown'
            subscription.tier = tier
            subscription.status = 'active'
            subscription.save()
            
            AuditLog.log_update(
                user=request.user,
                model_name='Subscription',
                object_id=getattr(subscription, 'id', None),
                object_repr=f"Subscription for {company.name}",
                changes={
                    'tier_changed': f"{old_tier} -> {tier.name}",
                    'action': action,
                },
                tenant=company,
                ip_address=get_client_ip(request)
            )
        
        return Response({
            'message': f'Subscription updated to {tier.name}',
            'subscription': {
                'id': getattr(subscription, 'id', None),
                'tier': getattr(tier, 'name', 'None'),
                'status': subscription.status,
                'expiry_date': subscription.expiry_date.isoformat() if subscription.expiry_date else None,
            }
        })


class ExtendSubscriptionView(APIView):
    """
    Grant temporary extension to a subscription.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def post(self, request, tenant_id):
        days = request.data.get('days', 0)
        reason = request.data.get('reason', '')
        
        try:
            company = Company.objects.get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        # Prefer the most recent active subscription; fall back to any subscription.
        subscription = (
            Subscription.objects.filter(company=company, status='active')
            .order_by('-created_at')
            .first()
            or Subscription.objects.filter(company=company).order_by('-created_at').first()
        )
        if not subscription:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extend expiry date
        if subscription.expiry_date:
            subscription.expiry_date += timedelta(days=days)
        else:
            subscription.expiry_date = timezone.now() + timedelta(days=days)
        
        if subscription.status == 'expired':
            subscription.status = 'active'
        
        subscription.save()
        
        # Log
        AuditLog.log_update(
            user=request.user,
            model_name='Subscription',
            object_id=getattr(subscription, 'id', None),
            object_repr=f"Subscription for {company.name}",
            changes={
                'extension_days': days,
                'new_expiry': subscription.expiry_date.isoformat() if subscription.expiry_date else None,
                'reason': reason,
            },
            tenant=company,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': f'Subscription extended by {days} days',
            'new_expiry_date': subscription.expiry_date.isoformat(),
        })


from .subscriptions_flags import FeatureFlagListView, FeatureFlagUpdateView



