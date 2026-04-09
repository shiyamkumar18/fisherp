from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from companies.models import Company

User = get_user_model()


class UnifiedLoginViewTests(TestCase):
    login_url = "/api/auth/login/"

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Tenant One",
            slug="tenant1",
            is_active=True,
            is_verified=True,
        )
        self.other_company = Company.objects.create(
            name="Tenant Two",
            slug="tenant2",
            is_active=True,
            is_verified=True,
        )
        self.tenant_user = User.objects.create(
            username="tenant_admin",
            email="tenant@example.com",
            role="tenant_admin",
            company=self.company,
        )
        self.tenant_user.set_password("tenant123")
        self.tenant_user.save()

        self.platform_user = User.objects.create(
            username="platform_operator",
            email="platform@example.com",
            role="platform_operator",
        )
        self.platform_user.set_password("platform123")
        self.platform_user.save()

    def test_tenant_login_requires_company_name(self):
        response = self.client.post(
            self.login_url,
            {"username": self.tenant_user.username, "password": "tenant123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Company name is required for company users.")

    def test_tenant_login_accepts_matching_company_slug(self):
        response = self.client.post(
            self.login_url,
            {
                "username": self.tenant_user.username,
                "password": "tenant123",
                "company_name": self.company.slug,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company_name"], self.company.name)
        self.assertEqual(response.data["redirect_url"], "/dashboard.html")

    def test_tenant_login_rejects_wrong_company_name(self):
        response = self.client.post(
            self.login_url,
            {
                "username": self.tenant_user.username,
                "password": "tenant123",
                "company_name": self.other_company.name,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "Invalid company or credentials")

    def test_platform_login_still_works_without_company_name(self):
        response = self.client.post(
            self.login_url,
            {"username": self.platform_user.username, "password": "platform123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["redirect_url"], "/platform/dashboard.html")
