"""
Enhanced JWT Authentication & Custom Auth Backend

Provides:
- Email-or-username authentication backend
- JWT token blacklisting on logout (requires rest_framework_simplejwt.token_blacklist)
- Structured audit logging for auth events
"""

import logging

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger("accounts.auth")

User = get_user_model()


class EmailOrUsernameBackend(ModelBackend):
    """
    Custom authentication backend that accepts either an email address or a
    username in the ``username`` field supplied to ``authenticate()``.

    Falls back to Django's default ``ModelBackend`` behaviour for all other
    checks (password hashing, is_active, permissions, etc.).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        # Try email first, then username
        user = User.objects.filter(email__iexact=username).first()
        if user is None:
            user = User.objects.filter(username__iexact=username).first()

        if user is None:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None


class LogoutView(APIView):
    """
    Blacklist the supplied refresh token on logout so it can no longer be
    used to obtain new access tokens.

    POST /api/auth/logout/
    Body: { "refresh": "<refresh_token>" }

    Authentication is not required — clients whose access token has already
    expired can still invalidate their refresh token.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "refresh token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            logger.warning(
                "logout_invalid_token user=%s error=%s",
                getattr(request.user, "username", "anonymous"),
                str(exc),
            )
            return Response(
                {"error": "Invalid or already expired token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            "logout_success user=%s",
            getattr(request.user, "username", "anonymous"),
        )
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
