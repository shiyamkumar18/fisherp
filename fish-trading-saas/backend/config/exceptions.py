from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

from exceptions import APIError

def custom_exception_handler(exc, context):
    """Custom handler for APIError format."""
    # Call DRF default first
    response = exception_handler(exc, context)
    
    if response is not None:
        return response
    
    if isinstance(exc, APIError):
        return Response({
            'error': exc.message,
            'code': exc.code,
        }, status=exc.status_code)
    
    # Fallback
    import traceback
    from django.conf import settings
    
    response_data = {
        'error': 'Internal server error',
        'code': 'INTERNAL_ERROR',
    }
    
    if settings.DEBUG:
        response_data['traceback'] = traceback.format_exc()
        
    return Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
