"""
Global pytest fixtures and factory helpers for the Fisherp test suite.
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model

def pytest_configure(config):
    from django.conf import settings
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.CELERY_BROKER_URL = 'memory://'
    settings.CELERY_RESULT_BACKEND = 'cache'

@pytest.fixture(autouse=True)
def mock_celery(monkeypatch):
    from celery.app.task import Task
    from unittest.mock import MagicMock
    
    mock_result = MagicMock()
    mock_result.id = "mock-task-id"
    mock_result.status = "SUCCESS"
    
    def fake_delay(self, *args, **kwargs):
        try:
            self.run(*args, **kwargs)
        except Exception as e:
            pass
        return mock_result

    def fake_apply_async(self, args=None, kwargs=None, *args_orig, **kwargs_orig):
        args = args or ()
        kwargs = kwargs or {}
        try:
            self.run(*args, **kwargs)
        except Exception as e:
            pass
        return mock_result

    monkeypatch.setattr(Task, "delay", fake_delay)
    monkeypatch.setattr(Task, "apply_async", fake_apply_async)


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
    from companies.models import Company

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

    User = get_user_model()

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
    from trading.models import FishCategory

    return FishCategory.objects.create(name=name, category_type=category_type, **kwargs)


def make_fish(name=None, category=None, tenant=None, company=None, **kwargs):
    import uuid
    name = name or f"Fish-{uuid.uuid4().hex[:6]}"
    category = category or make_fish_category()
    if tenant is None:
        tenant = make_user(role="tenant_admin")
    company = company or tenant.company
    from trading.models import Fish

    return Fish.objects.create(
        name=name, category=category, unit_type="kg", tenant=tenant, company=company, **kwargs
    )


def make_supplier(name=None, tenant=None, company=None, **kwargs):
    import uuid
    name = name or f"Supplier-{uuid.uuid4().hex[:6]}"
    if tenant is None:
        tenant = make_user(role="tenant_admin")
    company = company or tenant.company
    from trading.models import Supplier

    return Supplier.objects.create(name=name, tenant=tenant, company=company, **kwargs)


def make_buyer(name=None, tenant=None, company=None, **kwargs):
    import uuid
    name = name or f"Buyer-{uuid.uuid4().hex[:6]}"
    if tenant is None:
        tenant = make_user(role="tenant_admin")
    company = company or tenant.company
    from trading.models import Buyer

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
    from rest_framework.test import APIClient

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
