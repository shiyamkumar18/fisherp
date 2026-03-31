"""
Unit tests for the accounts app User model.
Covers: role normalization, platform vs tenant separation, field validation,
helper properties, and account security fields.
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from companies.models import Company

User = get_user_model()


pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_company(slug="test-company"):
    return Company.objects.create(slug=slug, name="Test Company", is_active=True)


# ---------------------------------------------------------------------------
# Platform user tests
# ---------------------------------------------------------------------------

class TestPlatformUserCreation:
    def test_platform_operator_created_without_company(self):
        user = User.objects.create_user(
            username="op1",
            password="pass",
            role="platform_operator",
        )
        assert user.is_platform_user is True
        assert user.company is None
        assert user.schema_name == "public"

    def test_platform_support_created_without_company(self):
        user = User.objects.create_user(
            username="sup1",
            password="pass",
            role="platform_support",
        )
        assert user.is_platform_user is True
        assert user.company is None

    def test_platform_operator_is_staff(self):
        user = User.objects.create_user(
            username="op2",
            password="pass",
            role="platform_operator",
        )
        assert user.is_staff is True

    def test_superuser_gets_platform_operator_role(self):
        """Superusers must be promoted to platform_operator role."""
        user = User.objects.create_superuser(
            username="su1",
            password="pass",
            email="su@test.com",
        )
        assert user.role == "platform_operator"
        assert user.is_platform_user is True


# ---------------------------------------------------------------------------
# Tenant user tests
# ---------------------------------------------------------------------------

class TestTenantUserCreation:
    def test_tenant_admin_auto_creates_company(self):
        user = User.objects.create_user(
            username="tadmin1",
            password="pass",
            role="tenant_admin",
        )
        assert user.company is not None
        assert user.is_platform_user is False

    def test_tenant_user_with_explicit_company(self):
        company = _make_company(slug="explicit-co")
        user = User.objects.create_user(
            username="tadmin2",
            password="pass",
            role="tenant_admin",
            company=company,
        )
        assert user.company == company

    def test_accountant_role_accepted(self):
        user = User.objects.create_user(
            username="acc1",
            password="pass",
            role="accountant",
        )
        assert user.role == "accountant"
        assert user.company is not None

    def test_trader_role_accepted(self):
        user = User.objects.create_user(
            username="trader1",
            password="pass",
            role="trader",
        )
        assert user.role == "trader"

    def test_store_role_accepted(self):
        user = User.objects.create_user(
            username="store1",
            password="pass",
            role="store",
        )
        assert user.role == "store"

    def test_tenant_admin_is_staff(self):
        user = User.objects.create_user(
            username="tadmin3",
            password="pass",
            role="tenant_admin",
        )
        assert user.is_staff is True

    def test_trader_is_not_staff(self):
        user = User.objects.create_user(
            username="trader2",
            password="pass",
            role="trader",
        )
        assert user.is_staff is False


# ---------------------------------------------------------------------------
# Legacy role normalization
# ---------------------------------------------------------------------------

class TestLegacyRoleNormalization:
    def test_sales_staff_mapped_to_trader(self):
        user = User.objects.create_user(
            username="ss1",
            password="pass",
            role="sales_staff",
        )
        assert user.role == "trader"

    def test_store_accounts_mapped_to_store(self):
        user = User.objects.create_user(
            username="sa1",
            password="pass",
            role="store_accounts",
        )
        assert user.role == "store"

    def test_platform_super_admin_mapped_to_platform_operator(self):
        user = User.objects.create_user(
            username="psa1",
            password="pass",
            role="platform_super_admin",
        )
        assert user.role == "platform_operator"


# ---------------------------------------------------------------------------
# Invalid role
# ---------------------------------------------------------------------------

class TestInvalidRole:
    def test_invalid_role_raises_validation_error(self):
        with pytest.raises((ValidationError, Exception)):
            user = User(username="bad1", role="nonexistent_role")
            user.set_password("pass")
            user.save()


# ---------------------------------------------------------------------------
# Role property helpers
# ---------------------------------------------------------------------------

class TestRoleProperties:
    def test_is_tenant_admin_property(self):
        user = User.objects.create_user(username="prop1", password="pass", role="tenant_admin")
        assert user.is_tenant_admin is True
        assert user.is_trader is False
        assert user.is_accountant is False
        assert user.is_store is False

    def test_is_trader_property(self):
        user = User.objects.create_user(username="prop2", password="pass", role="trader")
        assert user.is_trader is True
        assert user.is_sales_staff is True  # backward compat

    def test_is_store_property(self):
        user = User.objects.create_user(username="prop3", password="pass", role="store")
        assert user.is_store is True
        assert user.is_store_accounts is True  # backward compat

    def test_is_accountant_property(self):
        user = User.objects.create_user(username="prop4", password="pass", role="accountant")
        assert user.is_accountant is True

    def test_is_platform_operator_property(self):
        user = User.objects.create_user(username="prop5", password="pass", role="platform_operator")
        assert user.is_platform_operator is True

    def test_role_level_hierarchy(self):
        op = User.objects.create_user(username="hier1", password="pass", role="platform_operator")
        ta = User.objects.create_user(username="hier2", password="pass", role="tenant_admin")
        tr = User.objects.create_user(username="hier3", password="pass", role="trader")
        st = User.objects.create_user(username="hier4", password="pass", role="store")
        assert op.role_level > ta.role_level > tr.role_level > st.role_level

    def test_can_view_financials(self):
        ta = User.objects.create_user(username="fin1", password="pass", role="tenant_admin")
        acc = User.objects.create_user(username="fin2", password="pass", role="accountant")
        tr = User.objects.create_user(username="fin3", password="pass", role="trader")
        assert ta.can_view_financials() is True
        assert acc.can_view_financials() is True
        assert tr.can_view_financials() is False

    def test_can_manage_users(self):
        ta = User.objects.create_user(username="mng1", password="pass", role="tenant_admin")
        tr = User.objects.create_user(username="mng2", password="pass", role="trader")
        assert ta.can_manage_users() is True
        assert tr.can_manage_users() is False

    def test_can_delete_records(self):
        ta = User.objects.create_user(username="del1", password="pass", role="tenant_admin")
        acc = User.objects.create_user(username="del2", password="pass", role="accountant")
        assert ta.can_delete_records() is True
        assert acc.can_delete_records() is False

    def test_is_tenant_user(self):
        ta = User.objects.create_user(username="tu1", password="pass", role="tenant_admin")
        op = User.objects.create_user(username="tu2", password="pass", role="platform_operator")
        assert ta.is_tenant_user is True
        assert op.is_tenant_user is False


# ---------------------------------------------------------------------------
# Security fields
# ---------------------------------------------------------------------------

class TestSecurityFields:
    def test_default_security_field_values(self):
        user = User.objects.create_user(username="sec1", password="pass", role="trader")
        assert user.two_factor_enabled is False
        assert user.failed_login_attempts == 0
        assert user.locked_until is None
        assert user.last_login_ip is None

    def test_str_representation(self):
        user = User.objects.create_user(username="str1", password="pass", role="trader")
        assert str(user) == "str1"
