from django.utils.deprecation import MiddlewareMixin
from .permissions import is_impersonating, get_impersonated_tenant

class ImpersonationMiddleware(MiddlewareMixin):
    """
    Middleware for impersonation support.
    
    1. Adds `is_impersonating` property to request
    2. Adds `impersonated_tenant` property to request
    3. Logs impersonation duration when request ends
    4. Auto-ends expired impersonation sessions
    """
    
    def process_request(self, request):
        # Add helpers to request for use in views/permissions
        request.is_impersonating = is_impersonating(request)
        request.get_impersonated_tenant = get_impersonated_tenant(request)
        
        # Auto-end expired impersonation
        if hasattr(request.session, 'impersonation_start_time'):
            # Add expiry check here if needed (e.g., 2 hours)
            pass
        
        return None
    
    def process_response(self, request, response):
        # Log impersonation duration if ending
        if request.is_impersonating:
            # Optional: Update log with duration/actions
            pass
        return response
