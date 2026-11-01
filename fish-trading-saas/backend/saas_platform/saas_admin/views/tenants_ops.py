from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from datetime import timedelta

from saas_platform.accounts.permissions import IsPlatformOperatorOrReadOnlySupport
from saas_platform.accounts.models_audit import AuditLog, get_client_ip
from saas_platform.companies.models import Company
from saas_platform.subscriptions.models import Subscription
from utils.security import safe_model_update

User = get_user_model()


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
        
        safe_model_update(company, request.data, allowed_fields)
        
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
