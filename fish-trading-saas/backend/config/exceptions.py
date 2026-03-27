from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

from ..exceptions import APIError

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
    return Response({
        'error': 'Internal server error',
        'code': 'INTERNAL_ERROR',
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
