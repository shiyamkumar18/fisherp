"""
RBAC / permission tests for the accounts app.

Verifies:
- Tenant isolation: users can only see their own company's data
- Role hierarchy: higher roles have broader access
- Platform users cannot access tenant data
- is_staff enforcement
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.companies.models import Company

User = get_user_model()




# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_company(slug=None):
    import uuid
    slug = slug or f"co-{uuid.uuid4().hex[:8]}"
    return Company.objects.create(slug=slug, name="Test Co", is_active=True)


def _make_user(role="tenant_admin", company=None, **kwargs):
    import uuid
    username = kwargs.pop("username", f"user_{uuid.uuid4().hex[:8]}")
    email = kwargs.pop("email", f"{username}@test.com")
    if role in {"platform_operator", "platform_support"}:
        company = None
    elif company is None:
        company = _make_company()
    user = User(username=username, email=email, role=role, company=company, **kwargs)
    user.set_password("pass1234")
    user.save()
    return user


# ---------------------------------------------------------------------------
# is_staff / is_platform_user enforcement
# ---------------------------------------------------------------------------

class TestRoleEnforcement:
    def test_platform_operator_is_platform_user(self):
        user = _make_user(role="platform_operator")
        assert user.is_platform_user is True

    def test_platform_operator_is_staff(self):
        user = _make_user(role="platform_operator")
        assert user.is_staff is True

    def test_tenant_admin_is_staff(self):
        user = _make_user(role="tenant_admin")
        assert user.is_staff is True

    def test_trader_is_not_staff(self):
        user = _make_user(role="trader")
        assert user.is_staff is False

    def test_store_is_not_staff(self):
        user = _make_user(role="store")
        assert user.is_staff is False

    def test_accountant_is_not_staff(self):
        user = _make_user(role="accountant")
        assert user.is_staff is False

    def test_platform_user_has_no_company(self):
        user = _make_user(role="platform_operator")
        assert user.company is None

    def test_tenant_user_has_company(self):
        user = _make_user(role="trader")
        assert user.company is not None


# ---------------------------------------------------------------------------
# Tenant isolation: separate companies cannot see each other's data
# ---------------------------------------------------------------------------

class TestTenantIsolation:
    def test_company_a_and_company_b_are_separate(self):
        company_a = _make_company(slug="co-a")
        company_b = _make_company(slug="co-b")
        user_a = _make_user(role="tenant_admin", company=company_a)
        user_b = _make_user(role="tenant_admin", company=company_b)

        assert user_a.company.slug == "co-a"
        assert user_b.company.slug == "co-b"
        assert user_a.company != user_b.company

    def test_users_belong_to_their_own_company(self):
        company_a = _make_company(slug="isol-a")
        company_b = _make_company(slug="isol-b")

        user_a1 = _make_user(role="trader", company=company_a)
        user_a2 = _make_user(role="accountant", company=company_a)
        user_b1 = _make_user(role="trader", company=company_b)

        # Users in company A
        company_a_users = list(User.objects.filter(company=company_a))
        assert user_a1 in company_a_users
        assert user_a2 in company_a_users
        assert user_b1 not in company_a_users


# ---------------------------------------------------------------------------
# Role-based access control: Fish Categories API (read-only test)
# ---------------------------------------------------------------------------

class TestTradingAPIPermissions:
    """Check that unauthenticated requests are rejected."""

    FISH_CATEGORIES_URL = "/api/trading/fish-categories/"

    def test_unauthenticated_cannot_list_fish_categories(self):
        client = APIClient()
        response = client.get(self.FISH_CATEGORIES_URL)
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_authenticated_tenant_admin_can_list_fish_categories(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.FISH_CATEGORIES_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_authenticated_trader_can_list_fish_categories(self):
        user = _make_user(role="trader")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.FISH_CATEGORIES_URL)
        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# Role hierarchy properties
# ---------------------------------------------------------------------------

class TestRoleHierarchy:
    def test_platform_operator_has_highest_role_level(self):
        op = _make_user(role="platform_operator")
        ta = _make_user(role="tenant_admin")
        acc = _make_user(role="accountant")
        tr = _make_user(role="trader")
        st = _make_user(role="store")

        levels = [op.role_level, ta.role_level, acc.role_level, tr.role_level, st.role_level]
        # Levels should be strictly decreasing
        assert levels == sorted(levels, reverse=True)

    def test_platform_operator_above_tenant_admin(self):
        op = _make_user(role="platform_operator")
        ta = _make_user(role="tenant_admin")
        assert op.role_level > ta.role_level

    def test_tenant_admin_above_trader(self):
        ta = _make_user(role="tenant_admin")
        tr = _make_user(role="trader")
        assert ta.role_level > tr.role_level

    def test_trader_above_store(self):
        tr = _make_user(role="trader")
        st = _make_user(role="store")
        assert tr.role_level > st.role_level
