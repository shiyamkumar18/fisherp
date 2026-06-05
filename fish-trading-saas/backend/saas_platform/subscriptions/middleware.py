"""
Subscription Enforcement Middleware

This middleware ensures that:
1. Tenant's subscription is active
2. Subscription hasn't expired
3. Usage limits are not exceeded
4. Read and write operations are blocked if subscription is inactive or suspended
"""

import logging
from django.http import JsonResponse
from rest_framework import status
from django.utils import timezone

from .middleware_helpers import (
    _subscription_qs_for_user,
    _subscription_is_expired,
    _expiry_as_date,
)

logger = logging.getLogger(__name__)


class SubscriptionEnforcementMiddleware:
    """
    Middleware to enforce subscription validity for tenant operations.
    """
    
    # Paths starting with these are exempt from subscription check
    EXEMPT_PATHS = [
        '/api/accounts/',       # Authentication & user profile
        '/api/auth/',           # SimpleJWT auth
        '/api/subscriptions/',  # Billing / payment portals
        '/api/tiers/',          # Public tiers
        '/api-auth/',           # DRF login
        '/api/schema/',         # Schema docs
        '/api/docs/',           # Swagger docs
        '/api/redoc/',          # Redoc docs
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Only gate API requests
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        # Skip for exempt paths
        if self._is_exempt(request.path):
            return self.get_response(request)
        
        # Skip for unauthenticated users
        if not request.user or not request.user.is_authenticated:
            return self.get_response(request)
        
        # Skip for superusers and platform operators
        if request.user.is_superuser:
            return self.get_response(request)
        if getattr(request.user, 'is_platform_user', False):
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
        """
        user = request.user
        
        try:
            subscription = _subscription_qs_for_user(user).first()
            
            if not subscription:
                return JsonResponse({
                    'error': 'No active subscription found',
                    'message': 'Please subscribe to access this feature',
                    'code': 'NO_SUBSCRIPTION'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check explicitly for suspended status
            if subscription.status == 'suspended':
                return JsonResponse({
                    'error': 'Subscription suspended',
                    'message': 'Your account has been suspended. Please contact billing.',
                    'code': 'SUBSCRIPTION_SUSPENDED'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if subscription has expired
            if _subscription_is_expired(subscription):
                subscription.status = 'expired'
                subscription.save(update_fields=['status'])
                
                return JsonResponse({
                    'error': 'Subscription has expired',
                    'message': 'Please renew your subscription to continue using the platform',
                    'code': 'SUBSCRIPTION_EXPIRED',
                    'expiry_date': str(_expiry_as_date(subscription.expiry_date))
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check usage limits
            usage_error = self._check_usage_limits(subscription, request)
            if usage_error:
                return usage_error
            
            return None
            
        except Exception:
            logger.exception("Subscription enforcement failed for user_id=%s", getattr(user, "id", None))
            return JsonResponse({
                'error': 'Subscription validation unavailable',
                'message': 'Subscription enforcement is temporarily unavailable. Please retry shortly.',
                'code': 'SUBSCRIPTION_CHECK_FAILED'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    def _check_usage_limits(self, subscription, request):
        """
        Check if the tenant has exceeded their usage limits.
        """
        tier = subscription.tier
        if not tier:
            return None
            
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
            from business.trading.models import PurchaseBatch
            
            current_month = timezone.now().month
            if subscription.purchases_this_month > tier.max_purchases_per_month:
                scope_filter = {'company': subscription.company} if subscription.company_id else {'tenant': subscription.tenant}
                purchases_this_month = PurchaseBatch.objects.filter(
                    **scope_filter,
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
            from business.trading.models import Sale
            
            current_month = timezone.now().month
            scope_filter = {'company': subscription.company} if subscription.company_id else {'tenant': subscription.tenant}
            sales_this_month = Sale.objects.filter(
                **scope_filter,
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
