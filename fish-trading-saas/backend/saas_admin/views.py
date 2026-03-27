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

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Count, Sum, Q, F
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from datetime import timedelta
import secrets
import string

from accounts.models import User
from accounts.permissions import IsPlatformOperator, CanUseImpersonation
from accounts.models_audit import AuditLog, ImpersonationLog, get_client_ip
from companies.models import Company
from subscriptions.models import Subscription, SubscriptionTier, SubscriptionAddOn

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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)
        
        # ===== TENANT STATS =====
        total_tenants = Company.objects.count()
        
        # Get active subscriptions
        active_subscriptions = Subscription.objects.filter(
            status='active',
            expiry_date__gte=now.date()
        )
        active_tenants = active_subscriptions.count()
        
        expired_tenants = Subscription.objects.filter(
            Q(status='expired') | 
            Q(expiry_date__lt=now.date())
        ).count()
        
        suspended_tenants = Subscription.objects.filter(status='suspended').count()
        
        # ===== REVENUE STATS =====
        # MRR - Monthly Recurring Revenue (from active subscriptions)
        mrr = 0
        for sub in active_subscriptions.filter(billing_cycle='monthly'):
            mrr += float(sub.tier.price_monthly)
        
        # Yearly revenue projection
        yearly_projection = mrr * 12
        
        # Also add yearly subscriptions
        for sub in active_subscriptions.filter(billing_cycle='yearly'):
            yearly_projection += float(sub.tier.price_yearly)
            mrr += float(sub.tier.price_yearly) / 12
        
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
        
        # ===== SUBSCRIPTION TIERS BREAKDOWN =====
        tier_breakdown = []
        for tier in SubscriptionTier.objects.filter(is_active=True):
            count = Subscription.objects.filter(
                tier=tier,
                status='active',
                expiry_date__gte=now.date()
            ).count()
            tier_breakdown.append({
                'tier': tier.name,
                'count': count,
                'price_monthly': str(tier.price_monthly),
            })
        
        # ===== ACTIVITY RECENT =====
        recent_signups = Company.objects.order_by('-created_at')[:5]
        recent_signup_list = []
        for company in recent_signups:
            subscription = (
                Subscription.objects.filter(company=company)
                .order_by('-created_at')
                .first()
            )
            sub_status = subscription.status if subscription else 'none'
            expiry = subscription.expiry_date if subscription else None
            
            recent_signup_list.append({
                'id': company.id,
                'name': company.name,
                'slug': company.slug,
                'created_at': company.created_at.isoformat(),
                'subscription_status': sub_status,
                'expiry_date': expiry.isoformat() if expiry else None,
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Get query params
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        status_filter = request.query_params.get('status', 'all')
        search = request.query_params.get('search', '')
        
        # Base queryset - all companies
        companies = Company.objects.select_related('admin').order_by('-created_at')
        
        # Apply filters
        if status_filter != 'all':
            if status_filter == 'active':
                companies = companies.filter(
                    subscription__status='active',
                    subscription__expiry_date__gte=timezone.now().date()
                ).distinct()
            elif status_filter == 'expired':
                companies = companies.filter(
                    Q(subscription__status='expired') |
                    Q(subscription__expiry_date__lt=timezone.now().date())
                ).distinct()
            elif status_filter == 'suspended':
                companies = companies.filter(subscription__status='suspended').distinct()
        
        if search:
            companies = companies.filter(
                Q(name__icontains=search) |
                Q(slug__icontains=search) |
                Q(admin__email__icontains=search)
            )
        
        # Paginate
        paginator = Paginator(companies, page_size)
        page_obj = paginator.get_page(page)
        
        tenant_list = []
        for company in page_obj:
            # Get subscription info
            try:
                subscription = Subscription.objects.get(company=company)
                tier_name = subscription.tier.name
                sub_status = subscription.status
                expiry_date = subscription.expiry_date
                storage_used = float(subscription.storage_used_mb or 0)
                is_active = subscription.is_active()
                
                # Calculate days remaining
                if expiry_date:
                    days_remaining = (expiry_date - timezone.now().date()).days
                else:
                    days_remaining = None
            except Subscription.DoesNotExist:
                tier_name = 'None'
                sub_status = 'no_subscription'
                expiry_date = None
                storage_used = 0
                is_active = False
                days_remaining = None
            
            # Get user count
            user_count = User.objects.filter(company=company).count()
            
            # Get last activity (from audit logs)
            last_activity = AuditLog.objects.filter(
                tenant=company
            ).order_by('-timestamp').first()
            
            tenant_list.append({
                'id': company.id,
                'name': company.name,
                'slug': company.slug,
                'email': company.admin.email if company.admin else None,
                'phone': company.phone,
                'city': company.city,
                'created_at': company.created_at.isoformat(),
                'is_active': company.is_active,
                
                # Subscription info
                'subscription_status': sub_status,
                'tier': tier_name,
                'expiry_date': expiry_date.isoformat() if expiry_date else None,
                'days_remaining': days_remaining,
                'is_subscription_active': is_active,
                
                # Usage
                'user_count': user_count,
                'storage_used_mb': storage_used,
                
                # Activity
                'last_activity': last_activity.timestamp.isoformat() if last_activity else None,
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request, tenant_id):
        try:
            company = Company.objects.select_related('admin').get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get subscription
        try:
            subscription = Subscription.objects.get(company=company)
            tier = subscription.tier
            
            subscription_data = {
                'id': subscription.id,
                'status': subscription.status,
                'tier': {
                    'id': tier.id,
                    'name': tier.name,
                    'max_users': tier.max_users,
                    'max_storage_gb': tier.max_storage_gb,
                    'price_monthly': str(tier.price_monthly),
                    'price_yearly': str(tier.price_yearly),
                },
                'start_date': subscription.start_date.isoformat(),
                'expiry_date': subscription.expiry_date.isoformat() if subscription.expiry_date else None,
                'is_active': subscription.is_active(),
                'days_remaining': subscription.days_remaining(),
                'billing_cycle': subscription.billing_cycle,
                'auto_renewal': subscription.auto_renewal,
                'storage_used_mb': float(subscription.storage_used_mb or 0),
                'api_calls_this_month': subscription.api_calls_this_month,
                'total_paid_till_date': str(subscription.total_paid_till_date),
            }
        except Subscription.DoesNotExist:
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
            'id': company.id,
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
            'created_at': company.created_at.isoformat(),
            
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
            object_id=company.id,
            object_repr=str(company),
            changes=request.data,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Tenant updated successfully',
            'tenant': {
                'id': company.id,
                'name': company.name,
                'is_active': company.is_active,
                'is_verified': company.is_verified,
            }
        })


class TenantSuspendView(APIView):
    """
    Suspend or activate a tenant subscription.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
            subscription = Subscription.objects.get(company=company)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Subscription.DoesNotExist:
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
                object_id=subscription.id,
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
                object_id=subscription.id,
                object_repr=f"Subscription for {company.name}",
                changes={'status': 'active', 'reason': reason},
                tenant=company,
                ip_address=get_client_ip(request)
            )
            
            message = 'Tenant activated successfully'
        
        return Response({
            'message': message,
            'tenant_id': company.id,
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
        subscription, created = Subscription.objects.get_or_create(
            company=company,
            defaults={
                'tenant': company.admin,
                'tier': tier,
                'status': 'active',
                'start_date': timezone.now(),
                'expiry_date': timezone.now() + timedelta(days=30),
            }
        )
        
        if not created:
            old_tier = subscription.tier.name
            subscription.tier = tier
            subscription.status = 'active'
            subscription.save()
            
            AuditLog.log_update(
                user=request.user,
                model_name='Subscription',
                object_id=subscription.id,
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
                'id': subscription.id,
                'tier': tier.name,
                'status': subscription.status,
                'expiry_date': subscription.expiry_date.isoformat() if subscription.expiry_date else None,
            }
        })


class ExtendSubscriptionView(APIView):
    """
    Grant temporary extension to a subscription.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def post(self, request, tenant_id):
        days = request.data.get('days', 0)
        reason = request.data.get('reason', '')
        
        try:
            company = Company.objects.get(id=tenant_id)
            subscription = Subscription.objects.get(company=company)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Subscription.DoesNotExist:
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
            object_id=subscription.id,
            object_repr=f"Subscription for {company.name}",
            changes={
                'extension_days': days,
                'new_expiry': subscription.expiry_date.isoformat(),
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        """List all tenants with their enabled features"""
        tenant_id = request.query_params.get('tenant_id')
        
        if tenant_id:
            try:
                company = Company.objects.get(id=tenant_id)
                subscription = Subscription.objects.get(company=company)
                
                return Response({
                    'tenant': {
                        'id': company.id,
                        'name': company.name,
                    },
                    'enabled_features': subscription.enabled_features,
                    'tier_features': subscription.get_tier_features(),
                })
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Tenant not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            except Subscription.DoesNotExist:
                return Response(
                    {'error': 'No subscription found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Return all tenants with their features
        tenants = []
        for company in Company.objects.all()[:50]:
            try:
                subscription = Subscription.objects.get(company=company)
                tenants.append({
                    'id': company.id,
                    'name': company.name,
                    'tier': subscription.tier.name,
                    'enabled_features': subscription.enabled_features,
                })
            except Subscription.DoesNotExist:
                tenants.append({
                    'id': company.id,
                    'name': company.name,
                    'tier': 'None',
                    'enabled_features': {},
                })
        
        return Response({'tenants': tenants})


class FeatureFlagUpdateView(APIView):
    """
    Enable/disable specific features for a tenant.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
            subscription = Subscription.objects.get(company=company)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Subscription.DoesNotExist:
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
            object_id=subscription.id,
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
            return Response(
                {'error': f'Already impersonating {existing.tenant.name}. End current session first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create impersonation log
        impersonation = ImpersonationLog.objects.create(
            platform_user=request.user,
            tenant=company,
            impersonated_user=company.admin,
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
        request.session['impersonating_tenant_id'] = company.id
        request.session['impersonation_log_id'] = impersonation.id
        request.session['impersonation_start_time'] = timezone.now().isoformat()
        request.session.save()
        
        return Response({
            'message': f'Impersonation started for {company.name}',
            'impersonation_id': impersonation.id,
            'tenant': {
                'id': company.id,
                'name': company.name,
                'slug': company.slug,
            },
            'started_at': impersonation.start_time.isoformat(),
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
            'ended_at': impersonation.end_time.isoformat(),
            'duration': impersonation.duration_display,
        })


class ImpersonationStatusView(APIView):
    """
    Check current impersonation status.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        impersonation = ImpersonationLog.objects.filter(
            platform_user=request.user,
            is_active=True
        ).first()
        
        if impersonation:
            return Response({
                'is_impersonating': True,
                'tenant': {
                    'id': impersonation.tenant.id,
                    'name': impersonation.tenant.name,
                    'slug': impersonation.tenant.slug,
                },
                'started_at': impersonation.start_time.isoformat(),
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        impersonations = ImpersonationLog.objects.filter(
            is_active=True
        ).select_related('platform_user', 'tenant')
        
        return Response({
            'active_impersonations': [
                {
                    'id': imp.id,
                    'platform_user': imp.platform_user.username,
                    'tenant': {
                        'id': imp.tenant.id,
                        'name': imp.tenant.name,
                        'slug': imp.tenant.slug,
                    },
                    'started_at': imp.start_time.isoformat(),
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        
        if len(query) < 2:
            return Response(
                {'error': 'Query must be at least 2 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        companies = Company.objects.filter(
            Q(name__icontains=query) |
            Q(slug__icontains=query) |
            Q(admin__email__icontains=query) |
            Q(phone__icontains=query)
        )[:10]
        
        results = []
        for company in companies:
            try:
                subscription = Subscription.objects.get(company=company)
                status = subscription.status
                tier = subscription.tier.name
            except Subscription.DoesNotExist:
                status = 'none'
                tier = None
            
            results.append({
                'id': company.id,
                'name': company.name,
                'slug': company.slug,
                'email': company.admin.email if company.admin else None,
                'phone': company.phone,
                'subscription_status': status,
                'tier': tier,
            })
        
        return Response({'results': results})


class ResetPasswordView(APIView):
    """
    Reset tenant admin password.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def post(self, request, tenant_id):
        reason = request.data.get('reason', '').strip()
        
        if not reason:
            return Response(
                {'error': 'Reason is required for password reset'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
            admin_user = company.admin
        except Company.DoesNotExist:
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
        admin_user.set_password(temp_password)
        admin_user.save()
        
        # Log
        AuditLog.log_update(
            user=request.user,
            model_name='User',
            object_id=admin_user.id,
            object_repr=f"Password reset for {admin_user.username}",
            changes={'action': 'password_reset', 'reason': reason},
            tenant=company,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Password reset successfully',
            'user_id': admin_user.id,
            'username': admin_user.username,
            'temp_password': temp_password,
            'warning': 'Share this temporary password securely with the tenant admin.',
        })


class ForceLogoutView(APIView):
    """
    Force logout all users of a tenant.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
                    'id': log.id,
                    'user': log.user.username if log.user else 'System',
                    'tenant': log.tenant.name if log.tenant else None,
                    'action': log.action,
                    'model_name': log.model_name,
                    'object_id': log.object_id,
                    'ip_address': log.ip_address,
                    'timestamp': log.timestamp.isoformat(),
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
                    'id': log.id,
                    'platform_user': log.platform_user.username,
                    'tenant': {
                        'id': log.tenant.id,
                        'name': log.tenant.name,
                        'slug': log.tenant.slug,
                    },
                    'reason': log.reason,
                    'start_time': log.start_time.isoformat(),
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
                    'id': log.id,
                    'user': log.user.username if log.user else 'System',
                    'action': log.action,
                    'model_name': log.model_name,
                    'tenant': log.tenant.name if log.tenant else None,
                    'ip_address': log.ip_address,
                    'timestamp': log.timestamp.isoformat(),
                }
                for log in logs
            ]
        })


class SystemHealthView(APIView):
    """
    System health and monitoring metrics.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        """List all tiers"""
        tiers = SubscriptionTier.objects.all().order_by('display_order')
        
        return Response({
            'tiers': [
                {
                    'id': tier.id,
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
            object_id=tier.id,
            object_repr=f"Subscription tier: {tier.name}",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': f'Tier "{name}" created successfully',
            'tier': {
                'id': tier.id,
                'name': tier.name,
            }
        }, status=status.HTTP_201_CREATED)


class SubscriptionTierDetailView(APIView):
    """
    Manage individual subscription tier.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
            'id': tier.id,
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
            object_id=tier.id,
            object_repr=f"Subscription tier: {tier.name}",
            changes=changes,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Tier updated successfully',
            'tier': {
                'id': tier.id,
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Get last 30 days of data
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get audit logs for tenant activities
        logs = AuditLog.objects.filter(
            timestamp__gte=thirty_days_ago
        ).extra(
            select={'hour': 'EXTRACT(HOUR FROM timestamp)', 'day': 'EXTRACT(DOW FROM timestamp)'}
        ).values('hour', 'day').annotate(
            count=Count('id')
        )
        
        # Build heatmap data
        heatmap = {}
        for log in logs:
            hour = int(log['hour'])
            day = int(log['day'])
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
            billing_history.append({
                'id': sub.id,
                'tenant_name': sub.tenant.company.name if sub.tenant and sub.tenant.company else 'Unknown',
                'tier': sub.tier.name,
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
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
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Simulated backup status (in production, connect to actual backup system)
        # Get database size
        from django.db import connection
        from django.db.backends.utils import CursorDebugWrapper
        
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
