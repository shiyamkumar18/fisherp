"""
Security Headers Middleware

Adds security-related HTTP response headers to every response:
- Content-Security-Policy (CSP) to mitigate XSS
- X-Content-Type-Options: nosniff
- X-XSS-Protection header
- Referrer-Policy for privacy
- Permissions-Policy to restrict browser features
"""

from django.conf import settings


class SecurityHeadersMiddleware:
    """
    Injects production-grade security headers into every HTTP response.
    Django's built-in SecurityMiddleware handles HSTS, X-Frame-Options, etc.
    This middleware complements it with CSP and additional headers.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        self._add_security_headers(response)
        return response

    def _add_security_headers(self, response):
        # Content-Security-Policy: restrict sources to self by default.
        # Relaxed slightly in DEBUG mode to allow DRF browsable API and admin.
        if settings.DEBUG:
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self' data:;"
            )
        else:
            csp = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none';"
            )
        response["Content-Security-Policy"] = csp

        # Prevent MIME-type sniffing
        response["X-Content-Type-Options"] = "nosniff"

        # Legacy XSS protection (still respected by older browsers)
        response["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information sent with requests
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict access to browser features
        response["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
        )
