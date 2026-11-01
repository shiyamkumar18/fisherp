from functools import wraps
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework import status
from services.subscriptions.entitlement_service import SubscriptionService
from django.http import JsonResponse

def subscription_required(feature_code):
    """
    Decorator for function-based views to enforce subscription feature entitlement.
    Returns 403 Forbidden if the feature is unavailable in the current plan.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            company = getattr(request.user, 'company', None)
            
            if not SubscriptionService.has_feature(company, feature_code, user=request.user):
                return JsonResponse(
                    {'error': 'Feature unavailable in current plan or subscription expired.'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

class HasFeatureFactory:
    """
    Factory to generate a DRF BasePermission class dynamically for a given feature code.
    Usage in ViewSets:
    permission_classes = [IsAuthenticated, HasFeature('voice_ai')]
    """
    def __new__(cls, feature_code):
        class HasFeaturePermission(permissions.BasePermission):
            message = "Feature unavailable in current plan or subscription expired."

            def has_permission(self, request, view):
                if not request.user or not request.user.is_authenticated:
                    return False
                
                company = getattr(request.user, 'company', None)
                return SubscriptionService.has_feature(company, feature_code, user=request.user)

        # Set a clear name for debugging
        HasFeaturePermission.__name__ = f"HasFeature_{feature_code}"
        return HasFeaturePermission

def HasFeature(feature_code):
    """
    Helper wrapper for the class factory to maintain standard DRF syntax.
    Usage: permission_classes = [HasFeature('analytics')]
    """
    return HasFeatureFactory(feature_code)
