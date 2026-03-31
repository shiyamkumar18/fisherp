"""
Global pytest fixtures and factory helpers for the Fisherp test suite.
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from companies.models import Company
from trading.models import FishCategory, Fish, Supplier, Buyer

User = get_user_model()


# ---------------------------------------------------------------------------
# Database access marker (applied globally so we don't need @pytest.mark.django_db
# on every test that needs the DB – individual tests can still override).
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Low-level object factories (plain functions, not classes, to keep it simple)
# ---------------------------------------------------------------------------

def make_company(slug=None, name=None, **kwargs):
    import uuid
    uid = uuid.uuid4().hex[:8]
    slug = slug or f"company-{uid}"
    name = name or f"Company {uid}"
    return Company.objects.create(slug=slug, name=name, is_active=True, **kwargs)


def make_user(username=None, role="tenant_admin", company=None, password="testpass123", **kwargs):
    """Create a user without triggering the auto-company-creation side effect."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    username = username or f"user_{uid}"
    email = kwargs.pop("email", f"{username}@test.com")

    # Platform users must not have a company
    platform_roles = {"platform_operator", "platform_support"}
    if role in platform_roles:
        company = None

    # Tenant users need a company; create one if not supplied
    if role not in platform_roles and company is None:
        company = make_company()

    user = User(
        username=username,
        email=email,
        role=role,
        company=company,
        **kwargs,
    )
    user.set_password(password)
    user.save()
    return user


def make_fish_category(name=None, category_type="saltwater", **kwargs):
    import uuid
    name = name or f"Category-{uuid.uuid4().hex[:6]}"
    return FishCategory.objects.create(name=name, category_type=category_type, **kwargs)


def make_fish(name=None, category=None, tenant=None, company=None, **kwargs):
    import uuid
    name = name or f"Fish-{uuid.uuid4().hex[:6]}"
    category = category or make_fish_category()
    if tenant is None:
        tenant = make_user(role="tenant_admin")
    company = company or tenant.company
    return Fish.objects.create(
        name=name, category=category, unit_type="kg", tenant=tenant, company=company, **kwargs
    )


def make_supplier(name=None, tenant=None, company=None, **kwargs):
    import uuid
    name = name or f"Supplier-{uuid.uuid4().hex[:6]}"
    if tenant is None:
        tenant = make_user(role="tenant_admin")
    company = company or tenant.company
    return Supplier.objects.create(name=name, tenant=tenant, company=company, **kwargs)


def make_buyer(name=None, tenant=None, company=None, **kwargs):
    import uuid
    name = name or f"Buyer-{uuid.uuid4().hex[:6]}"
    if tenant is None:
        tenant = make_user(role="tenant_admin")
    company = company or tenant.company
    return Buyer.objects.create(name=name, tenant=tenant, company=company, **kwargs)


def make_purchase_batch(fish=None, tenant=None, company=None, **kwargs):
    from trading.models import PurchaseBatch

    if tenant is None:
        tenant = make_user(role="tenant_admin")
    company = company or tenant.company
    if fish is None:
        fish = make_fish(tenant=tenant, company=company)

    defaults = dict(
        purchase_type="package",
        fish=fish,
        number_of_packages=10,
        package_weight=Decimal("37.00"),
        price_per_kg=Decimal("100.00"),
        labour_cost=Decimal("500.00"),
        ice_cost=Decimal("300.00"),
        transport_cost=Decimal("200.00"),
        commission_cost=Decimal("100.00"),
        other_cost=Decimal("0.00"),
        amount_paid=Decimal("0.00"),
        tenant=tenant,
        company=company,
    )
    defaults.update(kwargs)
    # Let save() call calculate_fields() internally to avoid decimal precision
    # validation errors that arise when pre-calculating before full_clean().
    return PurchaseBatch.objects.create(**defaults)


# ---------------------------------------------------------------------------
# Pytest fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client():
    """Unauthenticated DRF test client."""
    return APIClient()


@pytest.fixture
def company(db):
    return make_company()


@pytest.fixture
def tenant_admin_user(db):
    return make_user(role="tenant_admin")


@pytest.fixture
def accountant_user(db, tenant_admin_user):
    return make_user(role="accountant", company=tenant_admin_user.company)


@pytest.fixture
def trader_user(db, tenant_admin_user):
    return make_user(role="trader", company=tenant_admin_user.company)


@pytest.fixture
def store_user(db, tenant_admin_user):
    return make_user(role="store", company=tenant_admin_user.company)


@pytest.fixture
def platform_operator_user(db):
    return make_user(role="platform_operator")


@pytest.fixture
def platform_support_user(db):
    return make_user(role="platform_support")


@pytest.fixture
def fish_category(db):
    return make_fish_category()


@pytest.fixture
def fish(db, tenant_admin_user, fish_category):
    return make_fish(category=fish_category, tenant=tenant_admin_user)


@pytest.fixture
def supplier(db, tenant_admin_user):
    return make_supplier(tenant=tenant_admin_user)


@pytest.fixture
def buyer(db, tenant_admin_user):
    return make_buyer(tenant=tenant_admin_user)


@pytest.fixture
def purchase_batch(db, fish, tenant_admin_user):
    return make_purchase_batch(fish=fish, tenant=tenant_admin_user)


@pytest.fixture
def auth_client(api_client, tenant_admin_user):
    """DRF test client authenticated as tenant_admin."""
    api_client.force_authenticate(user=tenant_admin_user)
    return api_client


@pytest.fixture
def trader_client(api_client, trader_user):
    """DRF test client authenticated as trader."""
    api_client.force_authenticate(user=trader_user)
    return api_client
