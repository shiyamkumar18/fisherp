"""
Subscription Enforcement Middleware

This middleware ensures that:
1. Tenant's subscription is active
2. Subscription hasn't expired
3. Usage limits are not exceeded
4. Write operations are blocked if subscription is inactive
"""

from django.http import JsonResponse
from django.utils import timezone
from functools import wraps
from rest_framework import status


class SubscriptionEnforcementMiddleware:
    """
    Middleware to enforce subscription validity for tenant operations.
    
    Usage:
        Add to MIDDLEWARE in settings.py:
        'subscriptions.middleware.SubscriptionEnforcementMiddleware'
    """
    
    # Endpoints that require active subscription (write operations)
    WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
    
    # Paths that don't require subscription check
    EXEMPT_PATHS = [
        '/api/auth/',           # Authentication endpoints
        '/api/subscriptions/', # Subscription management
        '/admin/',             # Django admin
        '/api/tiers/',         # Subscription tiers (public)
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip for exempt paths
        if self._is_exempt(request.path):
            return self.get_response(request)
        
        # Skip for unsafe methods (write operations) on exempt paths
        if request.method not in self.WRITE_METHODS:
            return self.get_response(request)
        
        # Skip for unauthenticated users
        if not request.user or not request.user.is_authenticated:
            return self.get_response(request)
        
        # Skip for superusers (they manage the platform)
        if request.user.is_superuser:
            return self.get_response(request)
        
        # Check subscription status
        subscription_error = self._check_subscription(request)
        if subscription_error:
            return subscription_error
        
        return self.get_response(request)
    
    def _is_exempt(self, path):
        """Check if path is exempt from subscription check"""
        for exempt_path in self.EXEMPT_PATHS:
            if path.startswith(exempt_path):
                return True
        return False
    
    def _check_subscription(self, request):
        """
        Check if the tenant has an active subscription.
        
        Returns:
            JsonResponse with error if subscription is invalid, None otherwise
        """
        from subscriptions.models import Subscription
        
        # Get tenant (user)
        user = request.user
        
        try:
            # Get active subscription for this tenant
            subscription = Subscription.objects.filter(
                tenant=user,
                status='active'
            ).first()
            
            if not subscription:
                return JsonResponse({
                    'error': 'No active subscription found',
                    'message': 'Please subscribe to access this feature',
                    'code': 'NO_SUBSCRIPTION'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if subscription has expired
            if subscription.expiry_date and subscription.expiry_date < timezone.now().date():
                # Mark as expired
                subscription.status = 'expired'
                subscription.save(update_fields=['status'])
                
                return JsonResponse({
                    'error': 'Subscription has expired',
                    'message': 'Please renew your subscription to continue using the platform',
                    'code': 'SUBSCRIPTION_EXPIRED',
                    'expiry_date': str(subscription.expiry_date)
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check usage limits
            usage_error = self._check_usage_limits(subscription, request)
            if usage_error:
                return usage_error
            
            # Check if subscription is about to expire (warning)
            if subscription.is_expiring_soon():
                # Add warning header but don't block
                # This is handled by the view if needed
                pass
            
            return None
            
        except Exception as e:
            # Log error but don't block (fail open for availability)
            # In production, you might want to log this
            return None
    
    def _check_usage_limits(self, subscription, request):
        """
        Check if the tenant has exceeded their usage limits.
        
        Returns:
            JsonResponse with error if limits exceeded, None otherwise
        """
        from subscriptions.models import Subscription
        from django.utils import timezone
        from datetime import timedelta
        
        # Get tier limits
        tier = subscription.tier
        
        # Check storage limit
        if tier.max_storage_gb:
            storage_used_gb = float(subscription.storage_used_mb or 0) / 1024
            if storage_used_gb > tier.max_storage_gb:
                return JsonResponse({
                    'error': 'Storage limit exceeded',
                    'message': f'You have exceeded your storage limit of {tier.max_storage_gb}GB',
                    'code': 'STORAGE_LIMIT_EXCEEDED',
                    'current_usage': f'{storage_used_gb:.2f}GB',
                    'limit': f'{tier.max_storage_gb}GB'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Check purchases limit (monthly)
        if tier.max_purchases_per_month:
            from trading.models import PurchaseBatch
            from django.db.models import Count
            
            # Reset counter if new month
            current_month = timezone.now().month
            if subscription.purchases_this_month > tier.max_purchases_per_month:
                # Count actual purchases this month
                purchases_this_month = PurchaseBatch.objects.filter(
                    tenant=subscription.tenant,
                    created_at__month=current_month
                ).count()
                
                if purchases_this_month > tier.max_purchases_per_month:
                    return JsonResponse({
                        'error': 'Purchase limit exceeded',
                        'message': f'You have exceeded your monthly purchase limit of {tier.max_purchases_per_month}',
                        'code': 'PURCHASE_LIMIT_EXCEEDED',
                        'current_usage': purchases_this_month,
                        'limit': tier.max_purchases_per_month
                    }, status=status.HTTP_403_FORBIDDEN)
        
        # Check sales limit (monthly)
        if tier.max_sales_per_month:
            from trading.models import Sale
            
            current_month = timezone.now().month
            sales_this_month = Sale.objects.filter(
                tenant=subscription.tenant,
                created_at__month=current_month
            ).count()
            
            if sales_this_month > tier.max_sales_per_month:
                return JsonResponse({
                    'error': 'Sales limit exceeded',
                    'message': f'You have exceeded your monthly sales limit of {tier.max_sales_per_month}',
                    'code': 'SALES_LIMIT_EXCEEDED',
                    'current_usage': sales_this_month,
                    'limit': tier.max_sales_per_month
                }, status=status.HTTP_403_FORBIDDEN)
        
        return None


def require_active_subscription(view_func):
    """
    Decorator to require active subscription for a view.
    
    Usage:
        @require_active_subscription
        def my_view(request):
            ...
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from subscriptions.models import Subscription
        
        # Skip for superusers
        if request.user.is_superuser:
            return view_func(request, *args, **kwargs)
        
        # Check for active subscription
        subscription = Subscription.objects.filter(
            tenant=request.user,
            status='active'
        ).first()
        
        if not subscription:
            return JsonResponse({
                'error': 'No active subscription',
                'message': 'Please subscribe to access this feature',
                'code': 'NO_SUBSCRIPTION'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check expiry
        if subscription.expiry_date and subscription.expiry_date < timezone.now().date():
            return JsonResponse({
                'error': 'Subscription expired',
                'message': 'Please renew your subscription',
                'code': 'SUBSCRIPTION_EXPIRED'
            }, status=status.HTTP_403_FORBIDDEN)
        
        return view_func(request, *args, **kwargs)
    
    return wrapper


def check_subscription_status(user):
    """
    Helper function to check subscription status.
    
    Returns:
        dict with 'is_valid', 'subscription', 'error', 'message'
    """
    from subscriptions.models import Subscription
    
    if user.is_superuser:
        return {
            'is_valid': True,
            'subscription': None,
            'error': None,
            'message': 'Superuser bypass'
        }
    
    subscription = Subscription.objects.filter(
        tenant=user,
        status='active'
    ).first()
    
    if not subscription:
        return {
            'is_valid': False,
            'subscription': None,
            'error': 'NO_SUBSCRIPTION',
            'message': 'No active subscription found'
        }
    
    if subscription.expiry_date and subscription.expiry_date < timezone.now().date():
        return {
            'is_valid': False,
            'subscription': subscription,
            'error': 'SUBSCRIPTION_EXPIRED',
            'message': 'Subscription has expired'
        }
    
    return {
        'is_valid': True,
        'subscription': subscription,
        'error': None,
        'message': 'Subscription is active'
    }

