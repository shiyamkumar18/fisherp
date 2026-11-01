from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from saas_platform.companies.models import Company


User = get_user_model()


class UnifiedLoginCompanyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(slug="tenant-a", name="Tenant A", is_active=True, is_verified=True)
        self.other_company = Company.objects.create(slug="tenant-b", name="Tenant B", is_active=True, is_verified=True)
        self.user = User.objects.create_user(
            username="tenant_admin_user",
            email="tenant@example.com",
            password="pass1234",
            role="tenant_admin",
            company=self.company,
        )
        self.platform_user = User.objects.create_user(
            username="platform_user",
            email="platform@example.com",
            password="pass1234",
            role="platform_operator",
        )

    def test_tenant_login_succeeds_without_company_name(self):
        response = self.client.post("/api/auth/login/", {"username": self.user.username, "password": "pass1234"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("company_name"), self.company.name)

    def test_tenant_login_with_matching_company_name_succeeds(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": self.user.username, "password": "pass1234", "company_name": self.company.name},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("company_name"), self.company.name)

    def test_tenant_login_with_wrong_company_is_rejected(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": self.user.username, "password": "pass1234", "company_name": self.other_company.name},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_platform_login_without_company_still_succeeds(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": self.platform_user.username, "password": "pass1234"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("redirect_url"), "/platform/dashboard.html")
