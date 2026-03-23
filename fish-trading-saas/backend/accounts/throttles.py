from rest_framework.throttling import ScopedRateThrottle

class LoginThrottle(ScopedRateThrottle):
    """
    Throttle login attempts to prevent brute force attacks.
    Rate: 5/min per IP/email
    """
    scope = 'login'
    
    def get_cache_key(self, request, view):
        email = request.data.get('email') or request.data.get('username', 'unknown')
        ip = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': f"{email}:{ip}"
        }

class ImpersonationThrottle(ScopedRateThrottle):
    """
    Throttle impersonation actions to prevent abuse.
    Rate: 2/hr per user/IP
    """
    scope = 'impersonate'
    
    def get_cache_key(self, request, view):
        user_id = request.user.id if request.user.is_authenticated else 'anon'
        ip = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': f"{user_id}:{ip}"
        }

