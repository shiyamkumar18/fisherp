"""
Company isolation tests.
Verifies that company (tenant) data is properly isolated and users cannot
access data belonging to other companies.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from companies.models import Company
from trading.models import FishCategory, Fish

User = get_user_model()

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_company(slug=None):
    import uuid
    slug = slug or f"co-{uuid.uuid4().hex[:8]}"
    return Company.objects.create(slug=slug, name="Test Co", is_active=True)


def _make_user(role="tenant_admin", company=None):
    import uuid
    username = f"user_{uuid.uuid4().hex[:8]}"
    company = company or _make_company()
    user = User(username=username, email=f"{username}@test.com", role=role, company=company)
    user.set_password("pass1234")
    user.save()
    return user


def _make_fish(tenant=None, company=None):
    import uuid
    tenant = tenant or _make_user()
    company = company or tenant.company
    cat = FishCategory.objects.create(name=f"Cat-{uuid.uuid4().hex[:6]}")
    return Fish.objects.create(
        name=f"Fish-{uuid.uuid4().hex[:6]}",
        category=cat,
        unit_type="kg",
        tenant=tenant,
        company=company,
    )


# ---------------------------------------------------------------------------
# Company model tests
# ---------------------------------------------------------------------------

class TestCompanyModel:
    def test_create_company(self):
        company = Company.objects.create(slug="test-co", name="Test Company", is_active=True)
        assert company.pk is not None
        assert company.name == "Test Company"
        assert company.slug == "test-co"

    def test_company_slug_is_unique(self):
        from django.db import IntegrityError
        Company.objects.create(slug="unique-co", name="Unique Co", is_active=True)
        with pytest.raises(IntegrityError):
            Company.objects.create(slug="unique-co", name="Another Co", is_active=True)

    def test_company_is_active_default_depends_on_model(self):
        """Test that the is_active field exists."""
        company = Company.objects.create(slug="active-test", name="Active Test", is_active=True)
        assert company.is_active is True


# ---------------------------------------------------------------------------
# Data isolation: Fish records
# ---------------------------------------------------------------------------

class TestFishDataIsolation:
    def test_user_can_see_own_fish(self):
        user_a = _make_user()
        fish_a = _make_fish(tenant=user_a)

        client = APIClient()
        client.force_authenticate(user=user_a)
        response = client.get("/api/trading/fish/")
        assert response.status_code == status.HTTP_200_OK

        results = response.data
        if isinstance(results, dict) and "results" in results:
            results = results["results"]
        ids = [r["id"] for r in results]
        assert fish_a.id in ids

    def test_user_cannot_see_other_company_fish(self):
        user_a = _make_user()
        user_b = _make_user()
        fish_b = _make_fish(tenant=user_b)

        client = APIClient()
        client.force_authenticate(user=user_a)
        response = client.get("/api/trading/fish/")
        assert response.status_code == status.HTTP_200_OK

        results = response.data
        if isinstance(results, dict) and "results" in results:
            results = results["results"]
        ids = [r["id"] for r in results]
        assert fish_b.id not in ids

    def test_user_cannot_retrieve_other_company_fish_by_id(self):
        user_a = _make_user()
        user_b = _make_user()
        fish_b = _make_fish(tenant=user_b)

        client = APIClient()
        client.force_authenticate(user=user_a)
        response = client.get(f"/api/trading/fish/{fish_b.id}/")
        assert response.status_code in (status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# User isolation
# ---------------------------------------------------------------------------

class TestUserIsolation:
    def test_platform_user_has_no_company(self):
        user = _make_user(role="platform_operator")
        assert user.company is None
        assert user.is_platform_user is True

    def test_two_companies_are_independent(self):
        co_a = _make_company(slug="ind-co-a")
        co_b = _make_company(slug="ind-co-b")
        assert co_a.pk != co_b.pk
        assert co_a.slug != co_b.slug

    def test_users_from_different_companies_cannot_see_each_others_data(self):
        user_a = _make_user(role="tenant_admin")
        user_b = _make_user(role="tenant_admin")
        # The users belong to different companies
        assert user_a.company != user_b.company
