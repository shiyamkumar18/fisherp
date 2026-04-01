"""
Tests for the User model in the accounts app.
Focuses on model-level behaviour: creation, roles, properties, validation.
"""
import pytest
from django.contrib.auth import get_user_model

from accounts.models import ROLE_HIERARCHY
from tests.factories import UserFactory, CompanyFactory

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestUserCreation:
    """Basic user creation across all roles."""

    def test_create_tenant_admin(self):
        user = UserFactory(role="tenant_admin")
        assert user.pk is not None
        assert user.role == "tenant_admin"
        assert user.company is not None

    def test_create_accountant(self):
        company = CompanyFactory()
        user = UserFactory(role="accountant", company=company)
        assert user.role == "accountant"
        assert user.company == company

    def test_create_trader(self):
        company = CompanyFactory()
        user = UserFactory(role="trader", company=company)
        assert user.role == "trader"

    def test_create_store_user(self):
        company = CompanyFactory()
        user = UserFactory(role="store", company=company)
        assert user.role == "store"

    def test_create_platform_operator(self):
        user = UserFactory(role="platform_operator")
        assert user.role == "platform_operator"
        assert user.company is None

    def test_create_platform_support(self):
        user = UserFactory(role="platform_support")
        assert user.role == "platform_support"
        assert user.company is None


class TestPlatformUserFlag:
    """is_platform_user is auto-set for platform roles."""

    def test_platform_operator_flag_is_true(self):
        user = UserFactory(role="platform_operator")
        assert user.is_platform_user is True

    def test_platform_support_flag_is_true(self):
        user = UserFactory(role="platform_support")
        assert user.is_platform_user is True

    def test_tenant_admin_flag_is_false(self):
        user = UserFactory(role="tenant_admin")
        assert user.is_platform_user is False

    def test_platform_user_has_no_company(self):
        user = UserFactory(role="platform_operator")
        assert user.company is None

    def test_tenant_user_has_company(self):
        user = UserFactory(role="tenant_admin")
        assert user.company is not None


class TestRoleHierarchy:
    """ROLE_HIERARCHY ordering and role_level property."""

    def test_platform_operator_has_highest_level(self):
        assert ROLE_HIERARCHY["platform_operator"] == 6

    def test_platform_support_level(self):
        assert ROLE_HIERARCHY["platform_support"] == 5

    def test_tenant_admin_level(self):
        assert ROLE_HIERARCHY["tenant_admin"] == 4

    def test_store_has_lowest_tenant_level(self):
        assert ROLE_HIERARCHY["store"] == 1

    def test_operator_outranks_tenant_admin(self):
        assert ROLE_HIERARCHY["platform_operator"] > ROLE_HIERARCHY["tenant_admin"]

    def test_role_level_property_returns_correct_value(self):
        user = UserFactory(role="accountant")
        assert user.role_level == ROLE_HIERARCHY["accountant"]


class TestRoleProperties:
    """Boolean property shortcuts on the User model."""

    def test_is_tenant_admin_true(self):
        user = UserFactory(role="tenant_admin")
        assert user.is_tenant_admin is True
        assert user.is_accountant is False

    def test_is_accountant_true(self):
        company = CompanyFactory()
        user = UserFactory(role="accountant", company=company)
        assert user.is_accountant is True
        assert user.is_tenant_admin is False

    def test_is_sales_staff_alias_for_trader(self):
        company = CompanyFactory()
        user = UserFactory(role="trader", company=company)
        assert user.is_sales_staff is True
        assert user.is_trader is True

    def test_is_store_accounts_alias_for_store(self):
        company = CompanyFactory()
        user = UserFactory(role="store", company=company)
        assert user.is_store_accounts is True
        assert user.is_store is True

    def test_is_platform_user_property(self):
        op = UserFactory(role="platform_operator")
        tenant = UserFactory(role="tenant_admin")
        assert op.is_platform_user is True
        assert tenant.is_platform_user is False


class TestPasswordHandling:
    """Passwords are hashed and not stored in plaintext."""

    def test_password_is_hashed(self):
        user = UserFactory(password="supersecret123")
        assert user.password != "supersecret123"
        assert user.check_password("supersecret123") is True

    def test_wrong_password_fails_check(self):
        user = UserFactory(password="correcthorse")
        assert user.check_password("wrongpassword") is False


class TestUserStrRepresentation:
    """__str__ returns the username."""

    def test_str_returns_username(self):
        user = UserFactory(username="fisherman_bob")
        assert str(user) == "fisherman_bob"

    def test_str_unique_for_different_users(self):
        user_a = UserFactory()
        user_b = UserFactory()
        assert str(user_a) != str(user_b)
