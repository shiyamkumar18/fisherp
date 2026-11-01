import logging

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from django.core.cache import cache

from core.health.postgres_health import full_health_check

logger = logging.getLogger(__name__)

class HealthLiveView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'status': 'healthy'})

class HealthReadyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            # Test DB
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            # Test Redis (Celery broker)
            import redis
            r = redis.from_url(settings.CELERY_BROKER_URL)
            r.ping()
            # Test Celery
            from business.trading.celery import app
            app.control.ping()
            # Test cache
            cache.set('health', 'ok', 1)
            cache.get('health')
            return Response({'status': 'ready'})
        except Exception:
            logger.exception("Readiness health check failed")
            return Response(
                {'status': 'not ready', 'error': 'dependency check failed'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class HealthPostgresView(APIView):
    """Detailed PostgreSQL health check (connection + replication lag)."""

    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        result = full_health_check()
        http_status = (
            status.HTTP_200_OK
            if result["overall"] in ("ok", "not_applicable", "warning")
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return Response(result, status=http_status)
