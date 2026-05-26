from django.utils.deprecation import MiddlewareMixin
from .permissions import is_impersonating, get_impersonated_tenant

class ImpersonationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.is_impersonating = is_impersonating(request)
        request.get_impersonated_tenant = get_impersonated_tenant(request)
        if request.is_impersonating and getattr(request, 'user', None) and request.user.is_authenticated:
            request.user._impersonating = True
            request.user.company = request.get_impersonated_tenant
        return None

    def process_response(self, request, response):
        if hasattr(request, 'is_impersonating') and request.is_impersonating:
            pass
        return response
