from rest_framework.throttling import ScopedRateThrottle

class LoginThrottle(ScopedRateThrottle):
    scope = 'login'

    def get_cache_key(self, request, view):
        email = request.data.get('email') or request.data.get('username', 'unknown')
        ip = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': f"{email}:{ip}"
        }

class ImpersonationThrottle(ScopedRateThrottle):
    scope = 'impersonate'

    def get_cache_key(self, request, view):
        user_id = request.user.id if request.user.is_authenticated else 'anon'
        ip = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': f"{user_id}:{ip}"
        }

class OTPThrottle(ScopedRateThrottle):
    scope = 'otp'

    def get_cache_key(self, request, view):
        phone = request.data.get('phone', 'unknown')
        ip = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': f"{phone}:{ip}"
        }
