from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from saas_platform.companies.models import Company

User = get_user_model()

class SaaSAdminTestCase(TestCase):
    def setUp(self):
        # Create a platform operator
        self.operator = User.objects.create_user(
            username="operator",
            email="operator@fisherp.com",
            password="testpassword",
            role="platform_operator"
        )
        
        # Create a regular tenant user
        self.company = Company.objects.create(name="Test Company", slug="test-company")
        self.tenant_user = User.objects.create_user(
            username="tenantuser",
            email="tenant@example.com",
            password="testpassword",
            company=self.company,
            role="tenant_admin"
        )
        
        self.client = APIClient()

class TestTenantManagementViews(SaaSAdminTestCase):
    def test_tenant_list_view_unauthenticated(self):
        url = reverse('tenant-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
    def test_tenant_list_view_unauthorized(self):
        self.client.force_authenticate(user=self.tenant_user)
        url = reverse('tenant-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
    def test_tenant_list_view_authorized(self):
        self.client.force_authenticate(user=self.operator)
        url = reverse('tenant-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        items = data.get('tenants', [])
        self.assertTrue(any(t['name'] == 'Test Company' for t in items))

    def test_tenant_detail_view(self):
        self.client.force_authenticate(user=self.operator)
        url = reverse('tenant-detail', kwargs={'tenant_id': self.company.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['name'], "Test Company")

class TestDashboardView(SaaSAdminTestCase):
    def test_dashboard_view_authorized(self):
        self.client.force_authenticate(user=self.operator)
        url = reverse('platform-dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('total_tenants', data)
