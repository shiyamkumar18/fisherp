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


# =====================================================
# 1. PLATFORM DASHBOARD - Global Analytics
# =====================================================

class PlatformDashboardView(APIView):
    """
    Global platform analytics dashboard.
    
    Shows SaaS KPIs without exposing tenant business data.
    
    ✅ Shows:
    - Total tenants, active tenants, expired tenants
    - MRR (Monthly Recurring Revenue)
    - Annual revenue projection
    - New signups this month
    - Churn rate
    - Average users per tenant
    - Total API calls, storage usage
    
    ❌ Does NOT show:
    - Tenant profit data
    - Tenant customer list
    - Tenant supplier data
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # ===== TENANT STATS =====
        total_tenants = Company.objects.count()
        
        # Get active subscriptions (distinct by company)
        active_subscriptions = Subscription.objects.filter(
            status='active',
            expiry_date__gte=now
        )
        active_tenants = active_subscriptions.values('company').distinct().count()
        
        expired_tenants = Subscription.objects.filter(
            Q(status='expired') |  # noqa: W504
            Q(expiry_date__lt=now)
        ).values('company').distinct().count()
        
        suspended_tenants = Subscription.objects.filter(status='suspended').values('company').distinct().count()
        
        # ===== REVENUE STATS =====
        # MRR - Monthly Recurring Revenue (from active subscriptions)
        # Single query with select_related instead of N+1 loop
        monthly_subs = active_subscriptions.filter(
            billing_cycle='monthly'
        ).select_related('tier')
        mrr = 0.0
        for sub in monthly_subs:
            if sub.tier:
                mrr += float(sub.tier.price_monthly or 0)

        # Yearly revenue projection
        yearly_projection = mrr * 12

        # Also add yearly subscriptions
        yearly_subs = active_subscriptions.filter(
            billing_cycle='yearly'
        ).select_related('tier')
        for sub in yearly_subs:
            if sub.tier:
                price_yearly = float(sub.tier.price_yearly or 0)
                yearly_projection += price_yearly
                mrr += price_yearly / 12
        
        # ===== GROWTH STATS =====
        # New signups this month
        new_signups_this_month = Company.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        # New signups last month (for churn calculation)
        last_month_start = thirty_days_ago - timedelta(days=30)
        new_signups_last_month = Company.objects.filter(
            created_at__gte=last_month_start,
            created_at__lt=thirty_days_ago
        ).count()
        
        # Churn rate calculation
        if total_tenants > 0:
            churn_rate = (expired_tenants / total_tenants) * 100
        else:
            churn_rate = 0
        
        # ===== USAGE STATS =====
        # Total users across all tenants
        total_users = User.objects.filter(
            role__in=['tenant_admin', 'accountant', 'trader', 'store', 'sales_staff', 'store_accounts']
        ).count()
        
        # Average users per tenant
        if total_tenants > 0:
            avg_users_per_tenant = round(total_users / total_tenants, 1)
        else:
            avg_users_per_tenant = 0
        
        # Total storage used
        total_storage_mb = active_subscriptions.aggregate(
            total=Sum('storage_used_mb')
        )['total'] or 0
        
        # Total API calls this month
        total_api_calls = active_subscriptions.aggregate(
            total=Sum('api_calls_this_month')
        )['total'] or 0
        
        # Support Incidents
        active_incidents = SupportTicket.objects.filter(status__in=['open', 'in_progress', 'escalated']).count()
        
        # ===== SUBSCRIPTION TIERS BREAKDOWN =====
        # Distinct companies per tier to avoid inflating stats
        tier_breakdown_query = Subscription.objects.filter(
            status='active',
            expiry_date__gte=now,
            tier__is_active=True,
        ).values('tier__name', 'tier__price_monthly').annotate(count=Count('company', distinct=True)).order_by('tier__name')
        
        tier_breakdown = [
            {
                'tier': row['tier__name'],
                'count': row['count'],
                'price_monthly': str(row['tier__price_monthly']),
            }
            for row in tier_breakdown_query
        ]
        
        # ===== ACTIVITY RECENT =====
        recent_signups = Company.objects.prefetch_related('subscriptions').order_by('-created_at')[:5]
        recent_signup_list = []
        for company in recent_signups:
            subscription = Subscription.objects.filter(company=company).order_by('-created_at').first()
            sub_status = subscription.status if subscription else 'none'
            expiry = subscription.expiry_date if subscription else None
            
            recent_signup_list.append({
                'id': getattr(company, 'id', None),
                'name': company.name,
                'slug': company.slug,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'subscription_status': sub_status,
                'expiry_date': expiry.isoformat() if expiry else None,
            })
        # ===== RECENT TICKETS =====
        recent_tickets_qs = SupportTicket.objects.select_related('tenant', 'assignee').order_by('-created_at')[:5]
        recent_tickets = []
        for t in recent_tickets_qs:
            time_remaining = "Breached"
            if t.sla_breach_at:
                if t.sla_breach_at > now:
                    delta = t.sla_breach_at - now
                    hours = int(delta.total_seconds() / 3600)
                    time_remaining = f"{hours}h"
            else:
                time_remaining = "N/A"
                
            recent_tickets.append({
                'id': f"TCK-{t.id}",
                'tenant': t.tenant.name,
                'agent': t.assignee.username if t.assignee else 'Unassigned',
                'priority': t.priority.capitalize(),
                'status': t.status.capitalize(),
                'timeRemaining': time_remaining,
            })
            
        return Response({
            # Tenant Stats
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'expired_tenants': expired_tenants,
            'suspended_tenants': suspended_tenants,
            
            # Revenue Stats
            'mrr': round(mrr, 2),
            'yearly_projection': round(yearly_projection, 2),
            
            # Growth Stats
            'new_signups_this_month': new_signups_this_month,
            'new_signups_last_month': new_signups_last_month,
            'churn_rate': round(churn_rate, 2),
            
            # Usage Stats
            'total_users': total_users,
            'avg_users_per_tenant': avg_users_per_tenant,
            'total_storage_mb': float(total_storage_mb),
            'total_api_calls': total_api_calls,
            
            # Support Stats
            'active_incidents': active_incidents,
            'recent_tickets': recent_tickets,
            
            # Breakdown
            'tier_breakdown': tier_breakdown,
            'recent_signups': recent_signup_list,
        })


# =====================================================
# 2. TENANT MANAGEMENT
# =====================================================

class TenantListView(APIView):
    """
    List all tenants with metadata.
    
    ✅ Platform Operator CAN see:
    - Tenant name, slug
    - Status (Active/Suspended/Expired)
    - Subscription tier
    - Expiry date
    - User count
    - Storage usage
    - Last activity
    
    ❌ Platform Operator CANNOT see:
    - Sales records
    - Profit data
    - Buyer names
    - Purchase details
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        # Get query params
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        status_filter = request.query_params.get('status', 'all')
        search = request.query_params.get('search', '')
        
        # Base queryset - all companies with prefetched relations to avoid N+1
        companies = (
            Company.objects.select_related('admin')
            .prefetch_related('subscriptions__tier')
            .annotate(
                user_count=Count('users', distinct=True),
                last_activity=Max('audit_logs__timestamp')
            )
            .order_by('-created_at')
        )
        
        # Apply filters
        if status_filter != 'all':
            if status_filter == 'active':
                companies = companies.filter(
                    subscription__status='active',
                    subscription__expiry_date__gte=timezone.now()
                ).distinct()
            elif status_filter == 'expired':
                companies = companies.filter(
                    Q(subscription__status='expired') |  # noqa: W504
                    Q(subscription__expiry_date__lt=timezone.now())
                ).distinct()
            elif status_filter == 'suspended':
                companies = companies.filter(subscription__status='suspended').distinct()
        
        if search:
            companies = companies.filter(
                Q(name__icontains=search) |  # noqa: W504
                Q(slug__icontains=search) |  # noqa: W504
                Q(admin__email__icontains=search)
            )
        
        # Paginate
        paginator = Paginator(companies, page_size)
        page_obj = paginator.get_page(page)
        
        tenant_list = []
        for company in page_obj:
            # Get subscription info from prefetched data (no extra query)
            subs = list(company.subscriptions.all())
            subs.sort(key=lambda s: s.created_at, reverse=True)
            subscription = subs[0] if subs else None
            
            if subscription:
                tier_name = getattr(subscription.tier, 'name', 'None') if subscription.tier else 'None'
                sub_status = subscription.status
                expiry_date = subscription.expiry_date
                storage_used = float(subscription.storage_used_mb or 0)
                is_active = subscription.is_active()
                days_remaining = (expiry_date.date() - timezone.now().date()).days if expiry_date else None
            else:
                tier_name = 'None'
                sub_status = 'no_subscription'
                expiry_date = None
                storage_used = 0
                is_active = False
                days_remaining = None
            
            # Get last activity (from annotation)
            last_activity = getattr(company, 'last_activity', None)
            
            admin_email = None
            try:
                admin_user = getattr(company, 'admin', None)
                if admin_user:
                    admin_email = getattr(admin_user, 'email', None)
            except (AttributeError, ObjectDoesNotExist):
                pass

            tenant_list.append({
                'id': getattr(company, 'id', None),
                'name': company.name,
                'slug': company.slug,
                'email': admin_email,
                'phone': company.phone,
                'city': company.city,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'is_active': company.is_active,
                
                # Subscription info
                'subscription_status': sub_status,
                'tier': tier_name,
                'expiry_date': expiry_date.isoformat() if expiry_date else None,
                'days_remaining': days_remaining,
                'is_subscription_active': is_active,
                
                # Usage
                'user_count': getattr(company, 'user_count', 0),
                'storage_used_mb': storage_used,
                
                # Activity
                'last_activity': last_activity.isoformat() if last_activity else None,
            })
        
        return Response({
            'tenants': tenant_list,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
            }
        })


class TenantDetailView(APIView):
    """
    View and manage individual tenant details.
    
    Supports:
    - View tenant metadata
    - Suspend/Activate tenant
    - Edit tenant settings
    - View subscription details
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request, tenant_id):
        try:
            company = Company.objects.select_related('admin').get(id=tenant_id)
        except (Company.DoesNotExist, ValidationError):
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get subscription — prefer the most recent active subscription
        subscription = (
            Subscription.objects.filter(company=company, status='active')
            .order_by('-created_at')
            .first()
            or Subscription.objects.filter(company=company).order_by('-created_at').first()
        )
        if subscription:
            tier = subscription.tier
            subscription_data = {
                'id': getattr(subscription, 'id', None),
                'status': subscription.status,
                'tier': {
                    'id': getattr(tier, 'id', None) if tier else None,
                    'name': getattr(tier, 'name', 'None') if tier else 'None',
                    'max_users': getattr(tier, 'max_users', 0) if tier else 0,
                    'max_storage_gb': getattr(tier, 'max_storage_gb', 0) if tier else 0,
                    'price_monthly': str(getattr(tier, 'price_monthly', 0)) if tier else '0',
                    'price_yearly': str(getattr(tier, 'price_yearly', 0)) if tier else '0',
                },
                'start_date': subscription.start_date.isoformat() if subscription.start_date else None,
                'expiry_date': subscription.expiry_date.isoformat() if subscription.expiry_date else None,
                'is_active': subscription.is_active(),
                'days_remaining': subscription.days_remaining(),
                'billing_cycle': subscription.billing_cycle,
                'auto_renewal': subscription.auto_renewal,
                'storage_used_mb': float(subscription.storage_used_mb or 0),
                'api_calls_this_month': subscription.api_calls_this_month,
                'total_paid_till_date': str(subscription.total_paid_till_date),
            }
        else:
            subscription_data = None
        
        # Get users
        users = User.objects.filter(company=company).values(
            'id', 'username', 'email', 'role', 'is_active', 'date_joined', 'last_login'
        )
        
        # Get recent activity (last 10)
        recent_activity = AuditLog.objects.filter(
            tenant=company
        ).order_by('-timestamp')[:10].values(
            'id', 'action', 'user__username', 'timestamp', 'ip_address'
        )
        
        return Response({
            'id': getattr(company, 'id', None),
            'name': company.name,
            'slug': company.slug,
            'email': company.email,
            'phone': company.phone,
            'city': company.city,
            'state': company.state,
            'country': company.country,
            'business_type': company.business_type,
            'industry_type': company.industry_type,
            'gst_number': company.gst_number,
            'is_active': company.is_active,
            'is_verified': company.is_verified,
            'created_at': company.created_at.isoformat() if company.created_at else None,
            
            'subscription': subscription_data,
            'users': list(users),
            'recent_activity': list(recent_activity),
        })
    
    def patch(self, request, tenant_id):
        """Update tenant settings"""
        try:
            company = Company.objects.get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Fields that platform operator can update
        allowed_fields = ['is_active', 'is_verified', 'phone', 'email']
        
        for field in allowed_fields:
            if field in request.data:
                setattr(company, field, request.data[field])
        
        company.save()
        
        # Log the action
        AuditLog.log_update(
            user=request.user,
            model_name='Company',
            object_id=getattr(company, 'id', None),
            object_repr=str(company),
            changes=request.data,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Tenant updated successfully',
            'tenant': {
                'id': getattr(company, 'id', None),
                'name': company.name,
                'is_active': company.is_active,
                'is_verified': company.is_verified,
            }
        })


class TenantSuspendView(APIView):
    """
    Suspend or activate a tenant subscription.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def post(self, request, tenant_id):
        action = request.data.get('action')  # 'suspend' or 'activate'
        reason = request.data.get('reason', '')
        
        if action not in ['suspend', 'activate']:
            return Response(
                {'error': 'Invalid action. Use "suspend" or "activate"'},
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
        
        if action == 'suspend':
            subscription.status = 'suspended'
            subscription.save()
            
            AuditLog.log_update(
                user=request.user,
                model_name='Subscription',
                object_id=getattr(subscription, 'id', None),
                object_repr=f"Subscription for {company.name}",
                changes={'status': 'suspended', 'reason': reason},
                tenant=company,
                ip_address=get_client_ip(request)
            )
            
            message = 'Tenant suspended successfully'
        else:
            subscription.status = 'active'
            subscription.save()
            
            AuditLog.log_update(
                user=request.user,
                model_name='Subscription',
                object_id=getattr(subscription, 'id', None),
                object_repr=f"Subscription for {company.name}",
                changes={'status': 'active', 'reason': reason},
                tenant=company,
                ip_address=get_client_ip(request)
            )
            
            message = 'Tenant activated successfully'
        
        return Response({
            'message': message,
            'tenant_id': getattr(company, 'id', None),
            'subscription_status': subscription.status,
        })


# =====================================================
# 3. SUBSCRIPTION MANAGEMENT
# =====================================================

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


# =====================================================
# 5. IMPERSONATION SYSTEM
# =====================================================

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


# =====================================================
# 6. SUPPORT TOOLS
# =====================================================

class TenantSearchView(APIView):
    """
    Search tenants by name, slug, email, or phone.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        
        if len(query) < 2:
            return Response(
                {'error': 'Query must be at least 2 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        companies = Company.objects.filter(
            Q(name__icontains=query) |  # noqa: W504
            Q(slug__icontains=query) |  # noqa: W504
            Q(admin__email__icontains=query) |  # noqa: W504
            Q(phone__icontains=query)
        )[:10]
        
        results = []
        for company in companies:
            subscription = Subscription.objects.filter(company=company, status='active').order_by('-created_at').first()
            if not subscription:
                subscription = Subscription.objects.filter(company=company).order_by('-created_at').first()
            
            if subscription:
                sub_status = subscription.status
                tier = getattr(subscription.tier, 'name', 'None') if subscription.tier else 'None'
            else:
                sub_status = 'none'
                tier = None
            
            admin_email = None
            try:
                admin_user = getattr(company, 'admin', None)
                if admin_user:
                    admin_email = getattr(admin_user, 'email', None)
            except (AttributeError, ObjectDoesNotExist):
                pass

            results.append({
                'id': getattr(company, 'id', None),
                'name': company.name,
                'slug': company.slug,
                'email': admin_email,
                'phone': company.phone,
                'subscription_status': sub_status,
                'tier': tier,
            })
        
        return Response({'results': results})


class ResetPasswordView(APIView):
    """
    Reset tenant admin password.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def post(self, request, tenant_id):
        reason = request.data.get('reason', '').strip()
        
        if not reason:
            return Response(
                {'error': 'Reason is required for password reset'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
            admin_user = getattr(company, 'admin', None)
        except (Company.DoesNotExist, ValidationError):
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not admin_user:
            return Response(
                {'error': 'No admin user found for this tenant'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate temporary password
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
        
        # Set new password
        set_password_func = getattr(admin_user, 'set_password', None)
        save_func = getattr(admin_user, 'save', None)
        
        if callable(set_password_func) and callable(save_func):
            set_password_func(temp_password)
            save_func()
        else:
            return Response(
                {'error': 'Admin user object is missing password management methods.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        username = getattr(admin_user, 'username', 'Unknown')
        
        # Log
        AuditLog.log_update(
            user=request.user,
            model_name='User',
            object_id=getattr(admin_user, 'id', None),
            object_repr=f"Password reset for {username}",
            changes={'action': 'password_reset', 'reason': reason},
            tenant=company,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Password reset successfully',
            'user_id': getattr(admin_user, 'id', None),
            'username': username,
            'temp_password': temp_password,
            'warning': 'Share this temporary password securely with the tenant admin.',
        })


class ForceLogoutView(APIView):
    """
    Force logout all users of a tenant.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def post(self, request, tenant_id):
        reason = request.data.get('reason', '').strip()
        
        if not reason:
            return Response(
                {'error': 'Reason is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all users in this tenant
        tenant_users = User.objects.filter(company=company)
        count = tenant_users.count()
        
        # Logout all (in production, would invalidate sessions)
        # For now, we just log the action
        AuditLog.objects.create(
            user=request.user,
            tenant=company,
            action='force_logout',
            model_name='User',
            object_repr=f"Force logout {count} users",
            ip_address=get_client_ip(request),
            changes={'reason': reason, 'users_affected': count}
        )
        
        return Response({
            'message': f'Force logout initiated for {count} users',
            'users_affected': count,
        })


class SendNotificationView(APIView):
    """
    Send system notification to a tenant.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def post(self, request, tenant_id):
        title = request.data.get('title', '').strip()
        message = request.data.get('message', '').strip()
        priority = request.data.get('priority', 'normal')  # normal, high, urgent
        
        if not title or not message:
            return Response(
                {'error': 'Title and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # In production, this would create a notification record
        # and potentially send email/push notification
        AuditLog.objects.create(
            user=request.user,
            tenant=company,
            action='notification_sent',
            model_name='Notification',
            object_repr=f"Notification to {company.name}",
            ip_address=get_client_ip(request),
            changes={'title': title, 'message': message, 'priority': priority}
        )
        
        return Response({
            'message': f'Notification sent to {company.name}',
            'notification': {
                'title': title,
                'message': message,
                'priority': priority,
                'sent_at': timezone.now().isoformat(),
            }
        })


# =====================================================
# 7. AUDIT & MONITORING
# =====================================================

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
