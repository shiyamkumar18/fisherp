"""
Model and fixture factories for test suite.
These are plain helper functions (no class-based factory-boy dependency)
that create test data quickly and consistently.
"""
import uuid
from decimal import Decimal
from django.contrib.auth import get_user_model

from companies.models import Company
from trading.models import FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Inventory
from subscriptions.models import SubscriptionTier, Subscription

User = get_user_model()


# ---------------------------------------------------------------------------
# Company factory
# ---------------------------------------------------------------------------

def CompanyFactory(slug=None, name=None, is_active=True, **kwargs):
    slug = slug or f"company-{uuid.uuid4().hex[:8]}"
    name = name or f"Company {slug.title()}"
    return Company.objects.create(slug=slug, name=name, is_active=is_active, **kwargs)


# ---------------------------------------------------------------------------
# User factory
# ---------------------------------------------------------------------------

def UserFactory(
    username=None,
    email=None,
    role="tenant_admin",
    company=None,
    password="testpass123",
    **kwargs,
):
    username = username or f"user_{uuid.uuid4().hex[:8]}"
    email = email or f"{username}@test.com"

    platform_roles = {"platform_operator", "platform_support"}
    if role in platform_roles:
        company = None
    elif company is None:
        company = CompanyFactory()

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


# ---------------------------------------------------------------------------
# Trading factories
# ---------------------------------------------------------------------------

def FishCategoryFactory(name=None, category_type="saltwater", **kwargs):
    name = name or f"Category-{uuid.uuid4().hex[:6]}"
    return FishCategory.objects.create(name=name, category_type=category_type, **kwargs)


def FishFactory(name=None, category=None, tenant=None, company=None, **kwargs):
    name = name or f"Fish-{uuid.uuid4().hex[:6]}"
    if tenant is None:
        tenant = UserFactory(role="tenant_admin")
    company = company or tenant.company
    category = category or FishCategoryFactory()
    return Fish.objects.create(
        name=name,
        category=category,
        unit_type="kg",
        tenant=tenant,
        company=company,
        **kwargs,
    )


def SupplierFactory(name=None, tenant=None, company=None, **kwargs):
    name = name or f"Supplier-{uuid.uuid4().hex[:6]}"
    if tenant is None:
        tenant = UserFactory(role="tenant_admin")
    company = company or tenant.company
    return Supplier.objects.create(name=name, tenant=tenant, company=company, **kwargs)


def BuyerFactory(name=None, tenant=None, company=None, **kwargs):
    name = name or f"Buyer-{uuid.uuid4().hex[:6]}"
    if tenant is None:
        tenant = UserFactory(role="tenant_admin")
    company = company or tenant.company
    return Buyer.objects.create(name=name, tenant=tenant, company=company, **kwargs)


def PurchaseBatchFactory(
    fish=None,
    tenant=None,
    company=None,
    number_of_packages=10,
    package_weight=Decimal("37.00"),
    price_per_kg=Decimal("100.00"),
    labour_cost=Decimal("500.00"),
    ice_cost=Decimal("300.00"),
    transport_cost=Decimal("200.00"),
    commission_cost=Decimal("100.00"),
    other_cost=Decimal("0.00"),
    amount_paid=Decimal("0.00"),
    **kwargs,
):
    if tenant is None:
        tenant = UserFactory(role="tenant_admin")
    company = company or tenant.company
    if fish is None:
        fish = FishFactory(tenant=tenant, company=company)

    return PurchaseBatch.objects.create(
        purchase_type="package",
        fish=fish,
        number_of_packages=number_of_packages,
        package_weight=package_weight,
        price_per_kg=price_per_kg,
        labour_cost=labour_cost,
        ice_cost=ice_cost,
        transport_cost=transport_cost,
        commission_cost=commission_cost,
        other_cost=other_cost,
        amount_paid=amount_paid,
        tenant=tenant,
        company=company,
        **kwargs,
    )


def InventoryFactory(batch=None, tenant=None, **kwargs):
    if batch is None:
        batch = PurchaseBatchFactory()
    tenant = tenant or batch.tenant
    company = batch.company
    fish = batch.fish

    defaults = dict(
        fish=fish,
        purchase_batch=batch,
        tenant=tenant,
        company=company,
        initial_packages=batch.number_of_packages,
        remaining_packages=batch.number_of_packages,
        sold_packages=0,
        initial_weight_kg=batch.total_weight,
        remaining_weight_kg=batch.total_weight,
    )
    defaults.update(kwargs)
    inv, _ = Inventory.objects.get_or_create(purchase_batch=batch, fish=fish, defaults=defaults)
    return inv


# ---------------------------------------------------------------------------
# Subscription factories
# ---------------------------------------------------------------------------

def SubscriptionTierFactory(name=None, **kwargs):
    name = name or f"tier_{uuid.uuid4().hex[:6]}"
    defaults = dict(
        description="Test subscription tier",
        max_users=5,
        max_storage_gb=10,
        price_monthly=Decimal("49.00"),
        price_yearly=Decimal("490.00"),
        is_active=True,
    )
    defaults.update(kwargs)
    return SubscriptionTier.objects.create(name=name, **defaults)


def SubscriptionFactory(company=None, tier=None, status="active", **kwargs):
    if company is None:
        company = CompanyFactory()
    tier = tier or SubscriptionTierFactory(name="basic")
    return Subscription.objects.create(tier=tier, status=status, company=company, **kwargs)
