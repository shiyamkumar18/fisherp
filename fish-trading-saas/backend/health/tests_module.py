from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase


class HealthReadyViewTest(APITestCase):
    def test_readiness_hides_internal_exception_details(self):
        with patch('health.views.connection.cursor', side_effect=RuntimeError('db exploded')):
            response = self.client.get('/health/ready/')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data['status'], 'not ready')
        self.assertEqual(response.data['error'], 'dependency check failed')
