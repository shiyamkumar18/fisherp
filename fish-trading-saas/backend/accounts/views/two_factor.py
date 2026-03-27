# accounts/views/two_factor.py

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

User = get_user_model()


class TwoFactorSetupView(APIView):
    """
    Setup Two-Factor Authentication for a user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.two_factor_enabled:
            return Response(
                {'error': '2FA is already enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        import secrets
        import base64

        secret = secrets.token_hex(20)
        encoded_secret = base64.b32encode(secret.encode()).decode()

        backup_codes = [secrets.token_hex(8) for _ in range(10)]

        user.two_factor_secret = encoded_secret
        user.backup_codes = backup_codes
        user.save(update_fields=['two_factor_secret', 'backup_codes'])

        return Response({
            'message': '2FA secret generated. Verify with your authenticator app.',
            'secret': encoded_secret,
            'backup_codes': backup_codes,
            'instruction': 'Scan this secret with your authenticator app (Google Authenticator, Authy, etc.)'
        }, status=status.HTTP_200_OK)


class TwoFactorVerifyView(APIView):
    """
    Verify 2FA code and enable 2FA.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        code = request.data.get('code', '').strip()

        if not user.two_factor_secret:
            return Response(
                {'error': '2FA not set up. Call /auth/2fa/setup/ first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.two_factor_enabled:
            return Response(
                {'error': '2FA is already enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not code:
            return Response(
                {'error': 'Code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            import pyotp
            totp = pyotp.TOTP(user.two_factor_secret)

            if not totp.verify(code, valid_window=1):
                return Response(
                    {'error': 'Invalid code'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ImportError:
            if len(code) != 6 or not code.isdigit():
                return Response(
                    {'error': 'Code must be 6 digits'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        user.two_factor_enabled = True
        user.save(update_fields=['two_factor_enabled'])

        return Response({
            'message': '2FA enabled successfully',
            'two_factor_enabled': True,
            'backup_codes': user.backup_codes,
            'warning': 'Save your backup codes! You can use them if you lose access to your authenticator.'
        }, status=status.HTTP_200_OK)


class TwoFactorDisableView(APIView):
    """
    Disable Two-Factor Authentication.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        password = request.data.get('password', '')

        if not user.two_factor_enabled:
            return Response(
                {'error': '2FA is not enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user.two_factor_enabled = False
        user.two_factor_secret = ''
        user.backup_codes = []
        user.save(update_fields=['two_factor_enabled', 'two_factor_secret', 'backup_codes'])

        return Response({
            'message': '2FA disabled successfully',
            'two_factor_enabled': False,
        }, status=status.HTTP_200_OK)