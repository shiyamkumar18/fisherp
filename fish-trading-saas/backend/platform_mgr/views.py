from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Sum, Count
from decimal import Decimal
from datetime import timedelta

from accounts.models import User
from accounts.permissions import IsPlatformOperator, IsPlatformSuperAdmin
from accounts.models_audit import AuditLog, ImpersonationLog
from subscriptions.models import Subscription, SubscriptionTier
from companies.models import Company


class TenantActivityHeatmapView(APIView):
    """
    Get tenant activity heatmap data.
    Shows which tenants are most active based on action counts.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Get activity for last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Group audit logs by tenant
        tenant_activity = AuditLog.objects.filter(
            timestamp__gte=thirty_days_ago,
            tenant__isnull=False
        ).values(
            'tenant__name',
            'tenant__id'
        ).annotate(
            action_count=Count('id'),
            unique_users=Count('user', distinct=True)
        ).order_by('-action_count')[:20]
        
        # Group by day
        daily_activity = AuditLog.objects.filter(
            timestamp__gte=thirty_days_ago,
            tenant__isnull=False
        ).extra(
            select={'day': 'DATE(timestamp)'}
        ).values('day').annotate(
            action_count=Count('id'),
            tenant_count=Count('tenant', distinct=True)
        ).order_by('day')
        
        return Response({
            'tenant_activity': list(tenant_activity),
            'daily_activity': list(daily_activity),
            'period': 'last_30_days',
        })


class BillingHistoryView(APIView):
    """
    Get billing history for all tenants.
    Shows subscription payments and revenue.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Get all subscriptions with payment history
        subscriptions = Subscription.objects.select_related(
            'tenant', 'tier'
        ).order_by('-last_payment_date')[:50]
        
        billing_data = []
        for sub in subscriptions:
            billing_data.append({
                'tenant_name': sub.tenant.name if sub.tenant else 'Unknown',
                'tier': sub.tier.name,
                'status': sub.status,
                'start_date': sub.start_date,
                'expiry_date': sub.expiry_date,
                'last_payment_date': sub.last_payment_date,
                'last_payment_amount': str(sub.last_payment_amount or 0),
                'total_paid_till_date': str(sub.total_paid_till_date or 0),
                'billing_cycle': sub.billing_cycle,
            })
        
        # Revenue summary
        total_revenue = Subscription.objects.aggregate(
            total=Sum('total_paid_till_date')
        )['total'] or Decimal('0.00')
        
        # Revenue by tier
        revenue_by_tier = []
        for tier in SubscriptionTier.objects.all():
            tier_revenue = Subscription.objects.filter(
                tier=tier
            ).aggregate(total=Sum('total_paid_till_date'))['total'] or Decimal('0.00')
            revenue_by_tier.append({
                'tier': tier.name,
                'revenue': str(tier_revenue),
            })
        
        return Response({
            'billing_history': billing_data,
            'total_revenue': str(total_revenue),
            'revenue_by_tier': revenue_by_tier,
        })


class ErrorTrackingView(APIView):
    """
    Get error tracking data.
    Shows permission denied events and failed operations.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Get recent permission denied events
        permission_denied = AuditLog.objects.filter(
            action='permission_denied'
        ).select_related('user').order_by('-timestamp')[:20]
        
        # Get failed login attempts
        failed_logins = AuditLog.objects.filter(
            action='failed_login'
        ).select_related('user').order_by('-timestamp')[:20]
        
        # Error statistics
        error_stats = {
            'permission_denied_count': AuditLog.objects.filter(
                action='permission_denied'
            ).count(),
            'failed_login_count': AuditLog.objects.filter(
                action='failed_login'
            ).count(),
        }
        
        return Response({
            'recent_permission_denied': [{
                'user': log.user.username if log.user else 'Unknown',
                'action': log.action,
                'model': log.model_name,
                'message': log.error_message,
                'timestamp': log.timestamp,
                'ip_address': log.ip_address,
            } for log in permission_denied],
            'recent_failed_logins': [{
                'user': log.user.username if log.user else 'Unknown',
                'timestamp': log.timestamp,
                'ip_address': log.ip_address,
            } for log in failed_logins],
            'statistics': error_stats,
        })


class BackupStatusView(APIView):
    """
    Get database backup status.
    This is a placeholder - actual implementation would connect to backup service.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Placeholder backup status
        # In production, this would connect to actual backup system
        return Response({
            'status': 'operational',
            'last_backup': timezone.now() - timedelta(hours=2),
            'next_scheduled_backup': timezone.now() + timedelta(hours=22),
            'backup_count': 30,
            'total_size_mb': 1024,
            'notes': 'Backups are configured to run daily at 2:00 AM UTC',
        })


class ImpersonationManagementView(APIView):
    """
    Manage impersonation sessions.
    Start, end, or list active impersonations.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # List active impersonations
        active_impersonations = ImpersonationLog.objects.filter(
            is_active=True
        ).select_related('platform_user', 'tenant')
        
        return Response({
            'active_impersonations': [{
                'id': imp.id,
                'platform_user': imp.platform_user.username,
                'tenant': imp.tenant.name,
                'reason': imp.reason,
                'start_time': imp.start_time,
                'duration': imp.duration_display,
            } for imp in active_impersonations],
        })
    
    def post(self, request):
        """Start a new impersonation session"""
        action = request.data.get('action', 'list')
        
        if action == 'start':
            tenant_id = request.data.get('tenant_id')
            reason = request.data.get('reason', 'Support investigation')
            
            if not tenant_id:
                return Response(
                    {'error': 'tenant_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                tenant = Company.objects.get(id=tenant_id)
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Tenant not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create impersonation log
            from accounts.permissions import get_client_ip
            from accounts.models_audit import AuditLog
            
            impersonation = ImpersonationLog.objects.create(
                platform_user=request.user,
                tenant=tenant,
                reason=reason,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
            )
            
            # Log the action
            AuditLog.log_impersonation_start(
                platform_user=request.user,
                tenant=tenant,
                reason=reason,
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'status': 'success',
                'impersonation_id': impersonation.id,
                'tenant': tenant.name,
                'message': f'Impersonation started for {tenant.name}',
            })
        
        elif action == 'end':
            impersonation_id = request.data.get('impersonation_id')
            
            if not impersonation_id:
                return Response(
                    {'error': 'impersonation_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                impersonation = ImpersonationLog.objects.get(
                    id=impersonation_id,
                    platform_user=request.user,
                    is_active=True
                )
            except ImpersonationLog.DoesNotExist:
                return Response(
                    {'error': 'Active impersonation not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            from accounts.permissions import get_client_ip
            from accounts.models_audit import AuditLog
            
            impersonation.end_impersonation()
            
            AuditLog.log_impersonation_end(
                platform_user=request.user,
                tenant=impersonation.tenant,
                ip_address=get_client_ip(request)
            )
            
            return Response({
                'status': 'success',
                'message': 'Impersonation ended successfully',
            })
        
        return Response(
            {'error': 'Invalid action. Use "start" or "end"'},
            status=status.HTTP_400_BAD_REQUEST
        )


class AuditLogListView(APIView):
    """
    List audit logs with filtering options.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        # Get filter parameters
        user_id = request.query_params.get('user_id')
        tenant_id = request.query_params.get('tenant_id')
        action = request.query_params.get('action')
        model_name = request.query_params.get('model_name')
        
        # Build queryset
        queryset = AuditLog.objects.select_related('user', 'tenant')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if action:
            queryset = queryset.filter(action=action)
        if model_name:
            queryset = queryset.filter(model_name__icontains=model_name)
        
        # Limit results
        limit = int(request.query_params.get('limit', 100))
        logs = queryset[:limit]
        
        return Response({
            'logs': [{
                'id': log.id,
                'user': log.user.username if log.user else None,
                'tenant': log.tenant.name if log.tenant else None,
                'action': log.action,
                'model_name': log.model_name,
                'object_id': log.object_id,
                'timestamp': log.timestamp,
                'ip_address': log.ip_address,
                'is_impersonation': log.is_impersonation,
            } for log in logs],
            'count': queryset.count(),
        })


class TenantManagementView(APIView):
    """
    Tenant management - list, create, update tenants.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        """List all tenants"""
        tenants = Company.objects.all().order_by('-created_at')
        
        tenant_data = []
        for tenant in tenants:
            # Get subscription status
            try:
                subscription = Subscription.objects.get(company=tenant)
                sub_status = subscription.status
                tier = subscription.tier.name
            except Subscription.DoesNotExist:
                sub_status = 'none'
                tier = 'none'
            
            # Get user count
            user_count = User.objects.filter(company=tenant).count()
            
            tenant_data.append({
                'id': tenant.id,
                'name': tenant.name,
                'slug': tenant.slug,
                'is_active': tenant.is_active,
                'is_verified': tenant.is_verified,
                'subscription_status': sub_status,
                'tier': tier,
                'user_count': user_count,
                'created_at': tenant.created_at,
            })
        
        return Response({'tenants': tenant_data})
    
    def post(self, request):
        """Create a new tenant"""
        name = request.data.get('name')
        slug = request.data.get('slug')
        
        if not name or not slug:
            return Response(
                {'error': 'name and slug are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if slug exists
        if Company.objects.filter(slug=slug).exists():
            return Response(
                {'error': 'Slug already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = Company.objects.create(
            name=name,
            slug=slug,
            is_active=True,
        )
        
        return Response({
            'status': 'success',
            'tenant_id': tenant.id,
            'tenant_name': tenant.name,
            'message': 'Tenant created successfully',
        })


class SubscriptionManagementView(APIView):
    """
    Subscription management - view and update tenant subscriptions.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        """List all subscriptions"""
        subscriptions = Subscription.objects.select_related(
            'tenant', 'tier'
        ).order_by('-expiry_date')
        
        sub_data = []
        for sub in subscriptions:
            sub_data.append({
                'id': sub.id,
                'tenant_name': sub.tenant.name if sub.tenant else 'Unknown',
                'tier': sub.tier.name,
                'status': sub.status,
                'start_date': sub.start_date,
                'expiry_date': sub.expiry_date,
                'auto_renewal': sub.auto_renewal,
            })
        
        return Response({'subscriptions': sub_data})
    
    def post(self, request):
        """Update subscription"""
        subscription_id = request.data.get('subscription_id')
        action = request.data.get('action')  # 'activate', 'suspend', 'cancel'
        
        if not subscription_id or not action:
            return Response(
                {'error': 'subscription_id and action are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscription = Subscription.objects.get(id=subscription_id)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if action == 'activate':
            subscription.status = 'active'
            subscription.save()
            message = 'Subscription activated'
        elif action == 'suspend':
            subscription.status = 'suspended'
            subscription.save()
            message = 'Subscription suspended'
        elif action == 'cancel':
            subscription.status = 'cancelled'
            subscription.save()
            message = 'Subscription cancelled'
        else:
            return Response(
                {'error': 'Invalid action'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'status': 'success',
            'message': message,
        })


class PlatformStatisticsView(APIView):
    """
    Get platform-wide statistics.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]
    
    def get(self, request):
        today = timezone.now().date()
        
        # Total tenants
        total_tenants = Company.objects.count()
        active_tenants = Company.objects.filter(is_active=True).count()
        
        # Total users
        total_users = User.objects.count()
        platform_users = User.objects.filter(
            role__in=['platform_operator', 'platform_support', 'platform_super_admin']
        ).count()
        
        # Subscriptions
        active_subs = Subscription.objects.filter(status='active').count()
        expired_subs = Subscription.objects.filter(
            status='active',
            expiry_date__lt=today
        ).count()
        
        # Revenue this month
        month_start = today.replace(day=1)
        monthly_revenue = Subscription.objects.filter(
            last_payment_date__gte=month_start
        ).aggregate(total=Sum('last_payment_amount'))['total'] or Decimal('0.00')
        
        # Total revenue
        total_revenue = Subscription.objects.aggregate(
            total=Sum('total_paid_till_date')
        )['total'] or Decimal('0.00')
        
        return Response({
            'tenants': {
                'total': total_tenants,
                'active': active_tenants,
            },
            'users': {
                'total': total_users,
                'platform_users': platform_users,
            },
            'subscriptions': {
                'active': active_subs,
                'expired': expired_subs,
            },
            'revenue': {
                'this_month': str(monthly_revenue),
                'total': str(total_revenue),
            },
        })
