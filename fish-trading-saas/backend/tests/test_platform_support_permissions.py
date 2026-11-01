import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from tests.factories import UserFactory, CompanyFactory, SubscriptionFactory
from django.utils import timezone
from saas_platform.accounts.models_audit import ImpersonationLog
from business.trading.models import Supplier

User = get_user_model()
pytestmark = pytest.mark.django_db

def test_platform_support_saas_admin_access():
    # Create support user
    support = UserFactory(role="platform_support")
    client = APIClient()
    client.force_authenticate(user=support)

    # 1. Read-only (GET) endpoints should succeed (HTTP 200)
    # Dashboard
    resp = client.get("/api/platform/dashboard/")
    assert resp.status_code == status.HTTP_200_OK

    # Tenants list
    resp = client.get("/api/platform/tenants/")
    assert resp.status_code == status.HTTP_200_OK

    # System Health
    resp = client.get("/api/platform/health/")
    assert resp.status_code == status.HTTP_200_OK

    # Audit log
    resp = client.get("/api/platform/audit/")
    assert resp.status_code == status.HTTP_200_OK

    # 2. Mutation (POST/PATCH/DELETE) endpoints should be blocked (HTTP 403)
    # Suspend tenant
    company = CompanyFactory()
    SubscriptionFactory(company=company)
    resp = client.post(f"/api/platform/tenants/{company.id}/suspend/", {"action": "suspend", "reason": "non-payment"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # Reset password
    resp = client.post(f"/api/platform/tenants/{company.id}/reset-password/", {"reason": "forgot"})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_platform_operator_saas_admin_access():
    # Create operator user
    operator = UserFactory(role="platform_operator")
    client = APIClient()
    client.force_authenticate(user=operator)

    # 1. Read-only (GET) endpoints should succeed (HTTP 200)
    resp = client.get("/api/platform/dashboard/")
    assert resp.status_code == status.HTTP_200_OK

    # 2. Mutation (POST/PATCH/DELETE) endpoints should succeed (or return 200/201/etc)
    company = CompanyFactory()
    SubscriptionFactory(company=company)
    resp = client.post(f"/api/platform/tenants/{company.id}/suspend/", {"action": "suspend", "reason": "testing"})
    # It should successfully process the suspension (return 200 OK since subscription is set)
    assert resp.status_code == status.HTTP_200_OK


def test_tenant_admin_saas_admin_blocked():
    # Tenant admin should be completely blocked
    admin_user = UserFactory(role="tenant_admin")
    client = APIClient()
    client.force_authenticate(user=admin_user)

    resp = client.get("/api/platform/dashboard/")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_platform_support_impersonation_data_access():
    # Support user
    support = UserFactory(role="platform_support")
    
    # Target tenant
    company = CompanyFactory()
    company_admin = UserFactory(role="tenant_admin", company=company)
    company.admin = company_admin
    company.save()
    
    # Create some tenant-specific data
    supplier = Supplier.objects.create(
        name="John Doe",
        phone="1234567890",
        company=company,
        tenant=company_admin
    )

    client = APIClient()
    client.force_authenticate(user=support)

    # Directly accessing supplier should return 403 Forbidden (since role flags are False)
    resp = client.get("/api/trading/suppliers/")
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    # Start impersonation session
    resp = client.post(f"/api/platform/impersonate/{company.id}/start/", {"reason": "Debugging customer issue"})
    assert resp.status_code == status.HTTP_200_OK
    
    # Explicitly set impersonating session keys on the client session for safety (tests run in isolated settings)
    session = client.session
    session["impersonating_tenant_id"] = company.id
    session.save()

    # Now accessing suppliers should retrieve the tenant's supplier!
    # (Validates the fix in QuerysetProtectionMixin)
    resp = client.get("/api/trading/suppliers/")
    assert resp.status_code == status.HTTP_200_OK
    results = resp.data.get("results", resp.data)
    assert len(results) == 1
    assert results[0]["name"] == "John Doe"
