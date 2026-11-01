from datetime import date, datetime
from functools import wraps
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status


def _subscription_qs_for_user(user):
    from saas_platform.subscriptions.models import Subscription
    qs = Subscription.objects.filter(status='active').order_by('-created_at')
    if user.company_id:
        return qs.filter(company=user.company)
    return qs.filter(tenant=user)


def _expiry_as_date(expiry_value):
    """Normalize subscription expiry values to a date for safe comparisons."""
    if expiry_value is None:
        return None
    if isinstance(expiry_value, datetime):
        if timezone.is_aware(expiry_value):
            return timezone.localtime(expiry_value).date()
        return expiry_value.date()
    if isinstance(expiry_value, date):
        return expiry_value
    return None


def _subscription_is_expired(subscription):
    expiry_date = _expiry_as_date(subscription.expiry_date)
    return bool(expiry_date and expiry_date < timezone.localdate())


def require_active_subscription(view_func):
    """
    Decorator to require active subscription for a view.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.is_superuser:
            return view_func(request, *args, **kwargs)
        
        subscription = _subscription_qs_for_user(request.user).first()
        
        if not subscription:
            return JsonResponse({
                'error': 'No active subscription',
                'message': 'Please subscribe to access this feature',
                'code': 'NO_SUBSCRIPTION'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if _subscription_is_expired(subscription):
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
    """
    if user.is_superuser:
        return {
            'is_valid': True,
            'subscription': None,
            'error': None,
            'message': 'Superuser bypass'
        }
    
    subscription = _subscription_qs_for_user(user).first()
    
    if not subscription:
        return {
            'is_valid': False,
            'subscription': None,
            'error': 'NO_SUBSCRIPTION',
            'message': 'No active subscription found'
        }
    
    if _subscription_is_expired(subscription):
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
