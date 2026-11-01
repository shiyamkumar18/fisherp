"""
Tests for the Company model.
Covers creation, uniqueness, soft-delete, relationships, str, and business fields.
"""
import pytest
from django.db import IntegrityError

from saas_platform.companies.models import Company
from tests.factories import CompanyFactory, UserFactory

pytestmark = pytest.mark.django_db


class TestCompanyCreation:
    """Basic Company creation and field defaults."""

    def test_company_can_be_created(self):
        company = CompanyFactory()
        assert company.pk is not None

    def test_company_name_stored_correctly(self):
        company = CompanyFactory(name="Coastal Fish Traders")
        assert company.name == "Coastal Fish Traders"

    def test_company_slug_stored_correctly(self):
        company = CompanyFactory(slug="coastal-fish")
        assert company.slug == "coastal-fish"

    def test_company_is_active_default_true(self):
        company = CompanyFactory()
        assert company.is_active is True

    def test_company_str_returns_name(self):
        company = CompanyFactory(name="Ocean Harvest Ltd")
        assert str(company) == "Ocean Harvest Ltd"


class TestCompanySlugUniqueness:
    """Slug must be unique across companies."""

    def test_duplicate_slug_raises_integrity_error(self):
        CompanyFactory(slug="duplicate-slug")
        with pytest.raises(IntegrityError):
            CompanyFactory(slug="duplicate-slug")

    def test_different_slugs_allowed(self):
        c1 = CompanyFactory(slug="company-one")
        c2 = CompanyFactory(slug="company-two")
        assert c1.slug != c2.slug


class TestCompanySoftDelete:
    """is_active=False acts as a soft-delete."""

    def test_company_can_be_deactivated(self):
        company = CompanyFactory(is_active=True)
        company.is_active = False
        company.save()
        company.refresh_from_db()
        assert company.is_active is False

    def test_inactive_company_still_exists_in_db(self):
        company = CompanyFactory(is_active=False)
        assert Company.objects.filter(pk=company.pk).exists()

    def test_company_can_be_reactivated(self):
        company = CompanyFactory(is_active=False)
        company.is_active = True
        company.save()
        company.refresh_from_db()
        assert company.is_active is True


class TestCompanyUserRelationship:
    """Company correctly tracks its users via reverse FK."""

    def test_company_has_users(self):
        company = CompanyFactory()
        u1 = UserFactory(role="tenant_admin", company=company)
        u2 = UserFactory(role="accountant", company=company)
        user_ids = list(company.users.values_list("id", flat=True))
        assert u1.id in user_ids
        assert u2.id in user_ids

    def test_get_user_count_is_correct(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        UserFactory(role="trader", company=company)
        assert company.get_user_count() == 2

    def test_can_add_user_below_limit(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        assert company.can_add_user(max_users=3) is True

    def test_cannot_add_user_at_limit(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        UserFactory(role="accountant", company=company)
        UserFactory(role="trader", company=company)
        assert company.can_add_user(max_users=3) is False


class TestCompanyBusinessInfoFields:
    """Company can store full business info."""

    def test_company_stores_gst_number(self):
        company = CompanyFactory()
        company.gst_number = "29ABCDE1234F1Z5"
        company.save()
        company.refresh_from_db()
        assert company.gst_number == "29ABCDE1234F1Z5"

    def test_company_stores_address(self):
        company = CompanyFactory()
        company.city = "Chennai"
        company.state = "Tamil Nadu"
        company.save()
        company.refresh_from_db()
        assert company.city == "Chennai"

    def test_get_full_address_includes_city(self):
        company = CompanyFactory()
        company.address_line1 = "12 Harbour Road"
        company.city = "Mumbai"
        company.save()
        addr = company.get_full_address()
        assert "Mumbai" in addr

    def test_login_url_includes_slug(self):
        company = CompanyFactory(slug="test-co")
        assert "test-co" in company.login_url
