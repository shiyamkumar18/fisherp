"""
Shared helper utilities and pytest fixtures usable across all test modules.
These complement conftest.py without duplicating its fixtures.
"""
import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient

from tests.factories import (
    CompanyFactory,
    UserFactory,
    SubscriptionFactory,
)


# ---------------------------------------------------------------------------
# Helper functions (not fixtures – call directly in tests)
# ---------------------------------------------------------------------------

def make_active_subscription(company):
    """Create an active Subscription for the given company (required for write ops)."""
    return SubscriptionFactory(
        company=company,
        status="active",
        expiry_date=timezone.now() + timedelta(days=365),
    )


def make_full_tenant_setup():
    """
    Return a dict with a company, five users (all roles), and an active subscription.
    Useful for integration-style tests that need a fully configured tenant.
    """
    company = CompanyFactory()
    admin = UserFactory(role="tenant_admin", company=company)
    accountant = UserFactory(role="accountant", company=company)
    trader = UserFactory(role="trader", company=company)
    store = UserFactory(role="store", company=company)
    subscription = make_active_subscription(company)

    return {
        "company": company,
        "admin": admin,
        "accountant": accountant,
        "trader": trader,
        "store": store,
        "subscription": subscription,
    }


def authenticated_client(user):
    """Return an APIClient authenticated as the given user."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# Pytest fixtures (none duplicate conftest.py)
# ---------------------------------------------------------------------------

@pytest.fixture
def active_subscription(db, company):
    """An active Subscription tied to the shared `company` fixture."""
    return make_active_subscription(company)


@pytest.fixture
def full_tenant(db):
    """Full tenant setup with all roles and an active subscription."""
    return make_full_tenant_setup()


@pytest.fixture
def second_company(db):
    """A second isolated company for multi-tenant isolation tests."""
    return CompanyFactory()


@pytest.fixture
def second_tenant_admin(db, second_company):
    return UserFactory(role="tenant_admin", company=second_company)


@pytest.fixture
def second_subscription(db, second_company):
    return make_active_subscription(second_company)


@pytest.fixture
def admin_client_fixture(db):
    """Return (user, APIClient) for a fresh tenant_admin."""
    user = UserFactory(role="tenant_admin")
    return user, authenticated_client(user)


@pytest.fixture
def expired_subscription(db):
    """An expired subscription to test enforcement."""
    company = CompanyFactory()
    return SubscriptionFactory(
        company=company,
        status="expired",
        expiry_date=timezone.now() - timedelta(days=1),
    )
