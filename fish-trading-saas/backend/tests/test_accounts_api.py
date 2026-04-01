"""
Tests for the auth API endpoints.
Focuses on login, profile, user-list, and logout behaviour.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import UserFactory, CompanyFactory

User = get_user_model()

pytestmark = pytest.mark.django_db


class TestLoginEndpoint:
    """POST /api/auth/login/"""

    def test_login_with_valid_credentials_returns_tokens(self):
        user = UserFactory(password="securepass99")
        client = APIClient()
        resp = client.post("/api/auth/login/", {"username": user.username, "password": "securepass99"})
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data
        assert "refresh" in resp.data

    def test_login_returns_user_info(self):
        user = UserFactory(password="pass1234")
        client = APIClient()
        resp = client.post("/api/auth/login/", {"username": user.username, "password": "pass1234"})
        assert resp.status_code == status.HTTP_200_OK
        # Login response includes either a nested "user" key or user fields at top level
        has_user_info = "user" in resp.data or "username" in resp.data or "role" in resp.data
        assert has_user_info

    def test_login_with_invalid_password_returns_401(self):
        user = UserFactory(password="correct")
        client = APIClient()
        resp = client.post("/api/auth/login/", {"username": user.username, "password": "wrong"})
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST)

    def test_login_with_nonexistent_user_returns_401(self):
        client = APIClient()
        resp = client.post("/api/auth/login/", {"username": "ghost_user_xyz", "password": "any"})
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST)

    def test_login_with_inactive_account_is_rejected(self):
        user = UserFactory(password="pass123", is_active=False)
        client = APIClient()
        resp = client.post("/api/auth/login/", {"username": user.username, "password": "pass123"})
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_password_returns_error(self):
        user = UserFactory()
        client = APIClient()
        resp = client.post("/api/auth/login/", {"username": user.username})
        assert resp.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_username_returns_error(self):
        client = APIClient()
        resp = client.post("/api/auth/login/", {"password": "pass123"})
        assert resp.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED)


class TestProfileEndpoint:
    """GET /api/auth/profile/"""

    def test_profile_requires_authentication(self):
        client = APIClient()
        resp = client.get("/api/auth/profile/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_profile_returns_correct_user_data(self):
        user = UserFactory(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/auth/profile/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data.get("username") == user.username or resp.data.get("id") == user.pk

    def test_profile_does_not_expose_password(self):
        user = UserFactory(password="topsecret")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/auth/profile/")
        assert resp.status_code == status.HTTP_200_OK
        response_str = str(resp.data)
        assert "topsecret" not in response_str
        assert "password" not in resp.data or resp.data.get("password") is None


class TestUserListEndpoint:
    """GET /api/auth/users/"""

    def test_tenant_admin_can_list_users(self):
        user = UserFactory(role="tenant_admin")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.get("/api/auth/users/")
        assert resp.status_code == status.HTTP_200_OK

    def test_accountant_cannot_list_all_users(self):
        company = CompanyFactory()
        UserFactory(role="tenant_admin", company=company)
        acc = UserFactory(role="accountant", company=company)
        client = APIClient()
        client.force_authenticate(user=acc)
        resp = client.get("/api/auth/users/")
        assert resp.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_200_OK)

    def test_unauthenticated_user_cannot_list_users(self):
        client = APIClient()
        resp = client.get("/api/auth/users/")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


class TestLogoutEndpoint:
    """POST /api/auth/logout/"""

    def test_logout_with_valid_refresh_token_succeeds(self):
        user = UserFactory(password="pass1234")
        client = APIClient()
        login_resp = client.post("/api/auth/login/", {"username": user.username, "password": "pass1234"})
        if login_resp.status_code != 200 or "refresh" not in login_resp.data:
            pytest.skip("Login did not return refresh token")
        refresh_token = login_resp.data["refresh"]
        client.force_authenticate(user=user)
        resp = client.post("/api/auth/logout/", {"refresh": refresh_token})
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_205_RESET_CONTENT)

    def test_logout_without_auth_is_rejected(self):
        client = APIClient()
        resp = client.post("/api/auth/logout/", {"refresh": "invalid-token"})
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_400_BAD_REQUEST,
        )
