from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from saas_platform.companies.models import Company
from saas_platform.permissions.models import Permission, Role, RolePermission, TenantRole

User = get_user_model()

class PermissionsTestCase(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Company", slug="test-company")
        
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword",
            company=self.company,
            role="staff"
        )
        
        self.role = Role.objects.create(name="Manager", description="Branch Manager")
        
        self.perm_view_sales, _ = Permission.objects.get_or_create(module="sales", action=Permission.Action.VIEW)
        self.perm_create_sales, _ = Permission.objects.get_or_create(module="sales", action=Permission.Action.CREATE)
        self.perm_view_dashboard, _ = Permission.objects.get_or_create(module="dashboard", action=Permission.Action.VIEW)
        
        RolePermission.objects.create(role=self.role, permission=self.perm_view_sales, allowed=True)
        RolePermission.objects.create(role=self.role, permission=self.perm_create_sales, allowed=False)
        RolePermission.objects.create(role=self.role, permission=self.perm_view_dashboard, allowed=True)
        
        TenantRole.objects.create(tenant=self.company, role=self.role)
        self.client = APIClient()

class TestPermissionsModels(PermissionsTestCase):
    def test_permission_str(self):
        self.assertEqual(str(self.perm_view_sales), "sales:view")
        
    def test_role_str(self):
        self.assertEqual(str(self.role), "Manager")
        
    def test_role_permission_str(self):
        role_perm = RolePermission.objects.get(role=self.role, permission=self.perm_view_sales)
        self.assertEqual(str(role_perm), "Manager - sales:view = True")
        
    def test_tenant_role_str(self):
        tenant_role = TenantRole.objects.first()
        self.assertEqual(str(tenant_role), "Test Company - Manager")

class TestPermissionsViews(PermissionsTestCase):
    def test_role_list_view_unauthenticated(self):
        url = "/api/permissions/roles/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_role_list_view_authenticated(self):
        self.client.force_authenticate(user=self.user)
        url = "/api/permissions/roles/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        
        manager_role = next((r for r in data if r['name'] == "Manager"), None)
        self.assertIsNotNone(manager_role)
        self.assertTrue(manager_role['permissions']['sales']['view'])
        self.assertFalse(manager_role['permissions']['sales']['create'])
        self.assertTrue(manager_role['permissions']['dashboard']['view'])

    def test_role_detail_view_success(self):
        self.client.force_authenticate(user=self.user)
        url = "/api/permissions/roles/Manager/"
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['name'], "Manager")
        self.assertTrue(data['permissions']['sales']['view'])
        self.assertFalse(data['permissions']['sales']['create'])

    def test_role_detail_view_not_found(self):
        self.client.force_authenticate(user=self.user)
        url = "/api/permissions/roles/NonExistent/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_permission_check_view_missing_params(self):
        self.client.force_authenticate(user=self.user)
        url = "/api/permissions/check/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_permission_check_view_valid(self):
        # Using unittest.mock to patch check_module_permission
        from unittest.mock import patch
        
        with patch('saas_platform.accounts.permissions.check_module_permission', return_value=True):
            self.client.force_authenticate(user=self.user)
            url = "/api/permissions/check/?module=sales&action=view"
            response = self.client.get(url)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            data = response.json()
            self.assertEqual(data['module'], 'sales')
            self.assertEqual(data['action'], 'view')
            self.assertTrue(data['allowed'])
