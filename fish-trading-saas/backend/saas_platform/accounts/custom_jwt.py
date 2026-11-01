import logging
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger("accounts.auth")

class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that sets impersonation flags on the user object
    after it is loaded from the database by SimpleJWT.
    """
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user, token = result
            from saas_platform.accounts.permissions import is_impersonating, get_impersonated_tenant
            if is_impersonating(request, user=user):
                user._impersonating = True
                user.company = get_impersonated_tenant(request, user=user)
        return result
