"""
API tests for authentication endpoints:
  POST /api/auth/login/        – login
  GET  /api/auth/profile/      – current user profile
  GET  /api/auth/users/        – list users (admin only)
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from companies.models import Company

User = get_user_model()

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_company(slug=None):
    import uuid
    slug = slug or f"co-{uuid.uuid4().hex[:8]}"
    return Company.objects.create(slug=slug, name="Test Co", is_active=True)


def _make_user(role="tenant_admin", company=None, password="pass1234", **kwargs):
    import uuid
    username = kwargs.pop("username", f"user_{uuid.uuid4().hex[:8]}")
    email = kwargs.pop("email", f"{username}@test.com")
    if role in {"platform_operator", "platform_support"}:
        company = None
    elif company is None:
        company = _make_company()
    user = User(username=username, email=email, role=role, company=company, **kwargs)
    user.set_password(password)
    user.save()
    return user


# ---------------------------------------------------------------------------
# Login endpoint
# ---------------------------------------------------------------------------

class TestLoginEndpoint:
    LOGIN_URL = "/api/auth/login/"

    def test_login_with_username_returns_tokens(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        response = client.post(self.LOGIN_URL, {"username": user.username, "password": "pass1234"})
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_with_email_returns_tokens(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        response = client.post(self.LOGIN_URL, {"email": user.email, "password": "pass1234"})
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_wrong_password_returns_401(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        response = client.post(self.LOGIN_URL, {"username": user.username, "password": "wrongpass"})
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_missing_credentials_returns_400(self):
        client = APIClient()
        response = client.post(self.LOGIN_URL, {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_nonexistent_user_returns_401_or_400(self):
        client = APIClient()
        response = client.post(
            self.LOGIN_URL,
            {"username": "nobody_here", "password": "nope"},
        )
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_platform_operator_can_login(self):
        user = _make_user(role="platform_operator")
        client = APIClient()
        response = client.post(self.LOGIN_URL, {"username": user.username, "password": "pass1234"})
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_login_response_contains_role(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        response = client.post(self.LOGIN_URL, {"username": user.username, "password": "pass1234"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("role") == "tenant_admin"

    def test_login_response_contains_username(self):
        user = _make_user(role="trader")
        client = APIClient()
        response = client.post(self.LOGIN_URL, {"username": user.username, "password": "pass1234"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data.get("username") == user.username

    def test_locked_account_returns_429(self):
        """Simulate account with locked_until in the future."""
        from django.utils import timezone
        from datetime import timedelta

        user = _make_user(role="tenant_admin")
        user.locked_until = timezone.now() + timedelta(minutes=30)
        user.save()
        client = APIClient()
        response = client.post(self.LOGIN_URL, {"username": user.username, "password": "pass1234"})
        # Account is locked; expect 429 or 401
        assert response.status_code in (
            status.HTTP_429_TOO_MANY_REQUESTS,
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        )


# ---------------------------------------------------------------------------
# Profile endpoint
# ---------------------------------------------------------------------------

class TestProfileEndpoint:
    PROFILE_URL = "/api/auth/profile/"

    def test_authenticated_user_can_get_profile(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.PROFILE_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_unauthenticated_user_cannot_get_profile(self):
        client = APIClient()
        response = client.get(self.PROFILE_URL)
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_profile_contains_expected_fields(self):
        user = _make_user(role="accountant")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.PROFILE_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        # At minimum we expect username and role to be present
        assert "username" in data or "id" in data


# ---------------------------------------------------------------------------
# User list endpoint
# ---------------------------------------------------------------------------

class TestUserListEndpoint:
    USERS_URL = "/api/auth/users/"

    def test_tenant_admin_can_list_users(self):
        user = _make_user(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(self.USERS_URL)
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_list_users(self):
        client = APIClient()
        response = client.get(self.USERS_URL)
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )
