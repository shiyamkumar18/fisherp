from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache

class HealthLiveView(APIView):
    def get(self, request):
        return Response({'status': 'healthy'})

class HealthReadyView(APIView):
    def get(self, request):
        try:
            # Test DB
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            # Test Redis (Celery broker)
            import redis
            r = redis.from_url('redis://localhost:6379/0')
            r.ping()
            # Test Celery
            from trading.celery import app
            app.control.ping()
            # Test cache
            cache.set('health', 'ok', 1)
            cache.get('health')
            return Response({'status': 'ready'})
        except Exception as e:
            return Response({'status': 'not ready', 'error': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
