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


