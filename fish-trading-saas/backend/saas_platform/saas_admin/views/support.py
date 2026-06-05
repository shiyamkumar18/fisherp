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


