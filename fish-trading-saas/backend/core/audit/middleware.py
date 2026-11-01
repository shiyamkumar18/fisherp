import threading
import uuid

_audit_context = threading.local()

def get_audit_context():
    """Returns the current request context for auditing"""
    if not hasattr(_audit_context, 'context'):
        return None
    return _audit_context.context

class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Build context
        context = {
            'request_id': str(uuid.uuid4()),
            'user': request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            'company': request.user.company if hasattr(request, 'user') and hasattr(request.user, 'company') else None,
            'ip_address': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'session_id': request.session.session_key if hasattr(request, 'session') else '',
            # Impersonation log is set in Impersonation middleware, so we might need to grab it 
            # if it's already set on the request.
            'impersonation_log_id': request.session.get('impersonation_log_id') if hasattr(request, 'session') else None,
        }

        # Try to parse basic device info from User-Agent
        ua = context['user_agent'].lower()
        if 'windows' in ua:
            context['os'] = 'Windows'
        elif 'mac' in ua:
            context['os'] = 'macOS'
        elif 'linux' in ua:
            context['os'] = 'Linux'
        elif 'android' in ua:
            context['os'] = 'Android'
        elif 'iphone' in ua or 'ipad' in ua:
            context['os'] = 'iOS'
        else:
            context['os'] = 'Unknown'

        if 'mobile' in ua:
            context['device'] = 'Mobile'
        else:
            context['device'] = 'Desktop'

        if 'chrome' in ua:
            context['browser'] = 'Chrome'
        elif 'firefox' in ua:
            context['browser'] = 'Firefox'
        elif 'safari' in ua:
            context['browser'] = 'Safari'
        elif 'edge' in ua:
            context['browser'] = 'Edge'
        else:
            context['browser'] = 'Unknown'

        _audit_context.context = context

        response = self.get_response(request)

        # Cleanup
        if hasattr(_audit_context, 'context'):
            del _audit_context.context

        return response

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
