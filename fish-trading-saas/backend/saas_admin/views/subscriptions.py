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


# =====================================================
# 4. FEATURE FLAGS
# =====================================================

class FeatureFlagListView(APIView):
    """
    List all feature flags across the platform.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        """List all tenants with their enabled features"""
        tenant_id = request.query_params.get('tenant_id')
        
        if tenant_id:
            try:
                company = Company.objects.get(id=tenant_id)
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Tenant not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
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
            return Response({
                'tenant': {
                    'id': getattr(company, 'id', None),
                    'name': company.name,
                },
                'enabled_features': subscription.enabled_features,
                'tier_features': subscription.get_tier_features(),
            })
        
        # Return all tenants with their features
        tenants = []
        companies = Company.objects.prefetch_related('subscriptions__tier')[:50]
        for company in companies:
            subs = list(company.subscriptions.all())
            subs.sort(key=lambda s: s.created_at, reverse=True)
            
            # find first active
            active_subs = [s for s in subs if s.status == 'active']
            subscription = active_subs[0] if active_subs else (subs[0] if subs else None)
            
            if subscription:
                tenants.append({
                    'id': getattr(company, 'id', None),
                    'name': company.name,
                    'tier': getattr(subscription.tier, 'name', 'None') if subscription.tier else 'None',
                    'enabled_features': subscription.enabled_features,
                })
            else:
                tenants.append({
                    'id': getattr(company, 'id', None),
                    'name': company.name,
                    'tier': 'None',
                    'enabled_features': {},
                })
        
        return Response({'tenants': tenants})


class FeatureFlagUpdateView(APIView):
    """
    Enable/disable specific features for a tenant.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def post(self, request, tenant_id):
        feature_name = request.data.get('feature_name')
        enabled = request.data.get('enabled', False)
        
        if not feature_name:
            return Response(
                {'error': 'feature_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
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
        
        # Update feature flag
        features = subscription.enabled_features or {}
        features[feature_name] = enabled
        subscription.enabled_features = features
        subscription.save()
        
        # Log
        AuditLog.log_update(
            user=request.user,
            model_name='Subscription',
            object_id=getattr(subscription, 'id', None),
            object_repr=f"Subscription for {company.name}",
            changes={'feature_flag': feature_name, 'enabled': enabled},
            tenant=company,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': f'Feature "{feature_name}" {"enabled" if enabled else "disabled"}',
            'enabled_features': subscription.enabled_features,
        })


