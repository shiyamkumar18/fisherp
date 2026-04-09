from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model, authenticate
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta
from django.db import transaction
from django.db.models import F
from urllib.parse import urlencode
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
import random

from ..throttles import LoginThrottle
from ..models import ROLE_CHOICES, PhoneOTPChallenge
from ..models_audit import AuditLog
from ..utils import (
    get_client_ip,
    get_user_role,
    user_role_flags,
    get_subscription_for_user,
    check_failed_login_attempts,
    record_failed_login,
    clear_failed_login,
    validate_password_strength,
    normalize_tenant_role,
    get_tokens_for_user,
)

User = get_user_model()

OTP_EXPIRY_SECONDS = 300
OTP_RESEND_WINDOW_SECONDS = 60
OTP_MAX_PER_WINDOW = 3
OTP_MAX_ATTEMPTS = 5


def _normalize_phone(raw_phone):
    digits = ''.join(char for char in str(raw_phone or '') if char.isdigit())
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    if len(digits) != 10:
        return None
    return digits


def _issue_otp(phone, purpose):
    challenge = PhoneOTPChallenge(
        phone=phone,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(seconds=OTP_EXPIRY_SECONDS),
    )
    otp_code = f"{random.SystemRandom().randint(0, 999999):06d}"
    challenge.set_code(otp_code)
    challenge.save()
    return challenge, otp_code


def _build_auth_response(user, redirect_url='/dashboard.html'):
    tokens = get_tokens_for_user(user)
    company_name = user.company.name if user.company else None
    company_slug = user.company.slug if user.company else None

    return {
        'message': 'Login successful',
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'phone': user.phone,
        'role': get_user_role(user),
        'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
        'tenant_slug': company_slug,
        'company_name': company_name,
        'schema_name': company_slug or user.schema_name,
        **user_role_flags(user),
        'can_view_financials': user.can_view_financials(),
        'can_manage_users': user.can_manage_users(),
        'can_delete_records': user.can_delete_records(),
        'two_factor_enabled': user.two_factor_enabled,
        'redirect_url': redirect_url,
        **tokens,
    }


def _complete_otp_login(user, request):
    client_ip = get_client_ip(request)

    if user.locked_until and user.locked_until > timezone.now():
        return None, Response(
            {'error': 'Account is locked. Try again later'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    if not user.is_active:
        return None, Response(
            {'error': 'Account is not active.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.is_superuser and not user.is_platform_maintainer and not user.is_platform_user:
        subscription = get_subscription_for_user(user)
        if subscription and not subscription.is_active():
            return None, Response(
                {'error': 'Subscription expired. Please renew to continue.'},
                status=status.HTTP_403_FORBIDDEN
            )

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_ip = client_ip
    user.last_login = timezone.now()
    user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip', 'last_login'])

    AuditLog.log_login(
        user=user,
        ip_address=client_ip,
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
    )

    redirect_url = '/platform/dashboard.html' if (user.is_platform_user or user.is_platform_maintainer) else '/dashboard.html'
    return _build_auth_response(user, redirect_url=redirect_url), None


def _frontend_auth_redirect(path, **params):
    filtered = {k: v for k, v in params.items() if v not in (None, "")}
    if filtered:
        return redirect(f"{path}?{urlencode(filtered)}")
    return redirect(path)


class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get('phone'))
        purpose = request.data.get('purpose') or PhoneOTPChallenge.PURPOSE_LOGIN

        if not phone:
            return Response({'error': 'Enter a valid 10-digit mobile number.'}, status=status.HTTP_400_BAD_REQUEST)

        if purpose not in {PhoneOTPChallenge.PURPOSE_LOGIN, PhoneOTPChallenge.PURPOSE_REGISTER}:
            return Response({'error': 'Invalid OTP purpose.'}, status=status.HTTP_400_BAD_REQUEST)

        window_start = timezone.now() - timedelta(seconds=OTP_RESEND_WINDOW_SECONDS)
        sent_recently = PhoneOTPChallenge.objects.filter(phone=phone, created_at__gte=window_start).count()
        if sent_recently >= OTP_MAX_PER_WINDOW:
            return Response(
                {'error': 'Too many OTP requests. Please wait before trying again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        challenge, otp_code = _issue_otp(phone, purpose)
        user_exists = User.objects.filter(phone=phone).exists()

        payload = {
            'message': 'OTP sent successfully.',
            'phone': phone,
            'purpose': purpose,
            'expires_in': OTP_EXPIRY_SECONDS,
            'user_exists': user_exists,
            'verification_id': str(challenge.token),
        }
        if settings.DEBUG:
            payload['otp_debug'] = otp_code

        return Response(payload, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = _normalize_phone(request.data.get('phone'))
        otp = str(request.data.get('otp') or '').strip()
        verification_id = request.data.get('verification_id')

        if not phone or len(otp) != 6 or not otp.isdigit():
            return Response({'error': 'Enter a valid phone number and 6-digit OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        challenge_qs = PhoneOTPChallenge.objects.filter(phone=phone, is_used=False).order_by('-created_at')
        if verification_id:
            challenge_qs = challenge_qs.filter(token=verification_id)
        challenge = challenge_qs.first()

        if not challenge or challenge.is_expired():
            return Response({'error': 'OTP expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if challenge.attempts >= OTP_MAX_ATTEMPTS:
            challenge.is_used = True
            challenge.save(update_fields=['is_used', 'updated_at'])
            return Response({'error': 'OTP expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        challenge.attempts += 1
        if not challenge.check_code(otp):
            if challenge.attempts >= OTP_MAX_ATTEMPTS:
                challenge.is_used = True
            challenge.save(update_fields=['attempts', 'is_used', 'updated_at'])
            return Response({'error': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        challenge.verified_at = timezone.now()
        challenge.save(update_fields=['attempts', 'verified_at', 'updated_at'])

        user = User.objects.filter(phone=phone).first()
        if user:
            payload, error_response = _complete_otp_login(user, request)
            if error_response:
                return error_response
            challenge.is_used = True
            challenge.save(update_fields=['is_used', 'updated_at'])
            payload['user_exists'] = True
            payload['phone'] = phone
            return Response(payload, status=status.HTTP_200_OK)

        return Response({
            'message': 'OTP verified successfully.',
            'user_exists': False,
            'phone': phone,
            'verification_token': str(challenge.token),
        }, status=status.HTTP_200_OK)


class UserLoginView(APIView):
    """
    Secure Multi-Tenant Login

    Features:
    - Email-based login
    - Failed attempt tracking (max 5)
    - IP logging
    - JWT with refresh token rotation
    """
    throttle_classes = [LoginThrottle]

    def get(self, request):
        """Show login form for browser access"""
        return _frontend_auth_redirect('/login.html')

    def post(self, request):
        from django.utils import timezone

        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        requested_tenant_slug = request.data.get('tenant_slug')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        client_ip = get_client_ip(request)

        is_locked, _ = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': 'Too many failed attempts. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            record_failed_login(email, client_ip, request.META.get('HTTP_USER_AGENT', '')[:500])
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': 'Account is locked. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if requested_tenant_slug:
            user_slug = user.company.slug if user.company else user.schema_name
            if user_slug != requested_tenant_slug:
                record_failed_login(email, client_ip, request.META.get('HTTP_USER_AGENT', '')[:500])
                return Response(
                    {'error': 'Invalid tenant context for this user.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        user_auth = authenticate(username=user.username, password=password)

        if user_auth is None:
            record_failed_login(email, client_ip, request.META.get('HTTP_USER_AGENT', '')[:500])

            with transaction.atomic():
                User.objects.filter(pk=user.pk).update(
                    failed_login_attempts=F('failed_login_attempts') + 1
                )
                user.refresh_from_db()
                if user.failed_login_attempts >= 5 and not user.locked_until:
                    user.locked_until = timezone.now() + timedelta(minutes=15)
                    user.save(update_fields=['locked_until'])

            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is not active. Please verify your email.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_superuser and not user.is_platform_maintainer and not user.is_platform_user:
            subscription = get_subscription_for_user(user)
            if subscription and not subscription.is_active():
                record_failed_login(email)
                return Response(
                    {'error': 'Subscription expired. Please renew to continue.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])

        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )

        if user.two_factor_enabled:
            temp_tokens = get_tokens_for_user(user)
            temp_tokens['temp_token'] = temp_tokens['access']
            del temp_tokens['access']
            return Response({
                'requires_2fa': True,
                **temp_tokens,
                'message': 'Please enter your 2FA code'
            }, status=status.HTTP_200_OK)

        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': get_user_role(user),
                'role_display': dict(ROLE_CHOICES).get(user.role, user.role),
                'schema_name': user.company.slug if user.company else user.schema_name,
                'is_platform_user': user.is_platform_user,
                'company_id': getattr(user.company, 'id', None),
            },
            **user_role_flags(user),
            'can_view_financials': user.can_view_financials(),
            'can_manage_users': user.can_manage_users(),
            'can_delete_records': user.can_delete_records(),
            'two_factor_enabled': user.two_factor_enabled,
            **tokens,
        }, status=status.HTTP_200_OK)


class TenantLoginView(APIView):
    """
    Tenant-specific login view.
    Each tenant/company gets a unique login URL like /login/acme-corp/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, tenant_slug):
        """Show tenant-specific login page"""
        try:
            from companies.models import Company
            company = Company.objects.get(slug=tenant_slug)

            if not company.is_active:
                return _frontend_auth_redirect(
                    '/login.html',
                    error='This company account is not active.',
                    company_name=company.name,
                    tenant_slug=tenant_slug,
                )

            return _frontend_auth_redirect(
                '/login.html',
                tenant_slug=tenant_slug,
                company_name=company.name,
            )

        except Company.DoesNotExist:
            return _frontend_auth_redirect('/login.html', error='Company not found.')

    def post(self, request, tenant_slug):  # noqa: C901
        """Handle tenant-specific login."""
        from django.utils import timezone
        from companies.models import Company

        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            company = Company.objects.get(slug=tenant_slug)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Invalid tenant'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not company.is_active:
            return Response(
                {'error': 'This company account is not active. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not company.is_verified:
            return Response(
                {'error': 'This company account is not verified. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )

        client_ip = get_client_ip(request)

        is_locked, _ = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': 'Too many failed attempts. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            user = None

        if user is None:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.company_id != company.id:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': 'Account is locked. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        user_auth = authenticate(username=user.username, password=password)

        if user_auth is None:
            record_failed_login(email, client_ip, request.META.get('HTTP_USER_AGENT', '')[:500])

            with transaction.atomic():
                User.objects.filter(pk=user.pk).update(
                    failed_login_attempts=F('failed_login_attempts') + 1
                )
                user.refresh_from_db()
                if user.failed_login_attempts >= 5 and not user.locked_until:
                    user.locked_until = timezone.now() + timedelta(minutes=15)
                    user.save(update_fields=['locked_until'])

            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is not active. Please verify your email.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_superuser and not user.is_platform_maintainer:
            subscription = get_subscription_for_user(user)
            if subscription and not subscription.is_active():
                record_failed_login(email)
                return Response(
                    {'error': 'Subscription expired. Please renew to continue.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])

        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )

        if user.two_factor_enabled:
            temp_token = RefreshToken.for_user(user)
            temp_token.set_exp(lifetime=timedelta(minutes=5))

            return Response({
                'requires_2fa': True,
                'temp_token': str(temp_token.access_token),
                'message': 'Please enter your 2FA code',
                'tenant_slug': tenant_slug,
                'company_name': company.name,
            }, status=status.HTTP_200_OK)

        access_token = RefreshToken.for_user(user)
        access_token.set_exp(lifetime=timedelta(minutes=15))

        return Response({
            'message': 'Login successful',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': get_user_role(user),
            'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
            'tenant_slug': tenant_slug,
            'company_name': company.name,
            'schema_name': user.company.slug if user.company else user.schema_name,
            **user_role_flags(user),
            'can_view_financials': user.can_view_financials(),
            'can_manage_users': user.can_manage_users(),
            'can_delete_records': user.can_delete_records(),
            'two_factor_enabled': user.two_factor_enabled,
            'redirect_url': '/dashboard.html',
            'refresh': str(RefreshToken.for_user(user)),
            'access': str(access_token.access_token),
        }, status=status.HTTP_200_OK)


class UnifiedLoginView(APIView):
    """
    Unified Login View for ALL company users.
    Single login URL (/login/) for tenant_admin, accountant, trader, store.
    Platform users use /platform-admin/.
    """
    permission_classes = [permissions.AllowAny]

    @staticmethod
    def _resolve_company(company_identifier):
        from companies.models import Company

        normalized_identifier = (company_identifier or "").strip()
        if not normalized_identifier:
            return None

        return Company.objects.filter(
            Q(slug__iexact=normalized_identifier) |
            Q(name__iexact=normalized_identifier)
        ).first()

    def get(self, request, tenant_slug=None):
        """Show unified login page"""
        params = {}
        if tenant_slug:
            try:
                from companies.models import Company
                company = Company.objects.get(slug=tenant_slug)
                params['company_name'] = company.name
                params['tenant_slug'] = tenant_slug
            except Company.DoesNotExist:
                params['error'] = 'Company not found.'

        return _frontend_auth_redirect('/login.html', **params)

    def post(self, request, tenant_slug=None):  # noqa: C901
        """Handle unified login for all company users."""
        from django.utils import timezone
        from companies.models import Company

        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        company_identifier = (
            request.data.get('company_name')
            or request.data.get('company')
            or request.data.get('company_code')
        )

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        client_ip = get_client_ip(request)

        is_locked, _ = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': 'Too many failed attempts. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            user = None

        company = None
        if tenant_slug:
            try:
                company = Company.objects.get(slug=tenant_slug)
            except Company.DoesNotExist:
                record_failed_login(email)
                return Response(
                    {'error': 'Invalid tenant'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not company.is_active:
                record_failed_login(email)
                return Response(
                    {'error': 'This company account is not active. Please contact support.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if user and user.company_id != company.id:
                record_failed_login(email)
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        elif company_identifier:
            company = self._resolve_company(company_identifier)
            if not company:
                record_failed_login(email)
                return Response(
                    {'error': 'Invalid company or credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            if not company.is_active:
                record_failed_login(email)
                return Response(
                    {'error': 'This company account is not active. Please contact support.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if not company.is_verified:
                record_failed_login(email)
                return Response(
                    {'error': 'This company account is not verified. Please contact support.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if user is None:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': 'Account is locked. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        user_auth = authenticate(username=user.username, password=password)

        if user_auth is None:
            record_failed_login(email)

            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = timezone.now() + timedelta(minutes=15)
            user.save()

            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is not active. Please verify your email.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        is_platform_user = user.is_platform_user or user.is_platform_maintainer

        if company:
            if user.company_id != company.id:
                record_failed_login(email)
                return Response(
                    {'error': 'Invalid company or credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        elif not tenant_slug and not is_platform_user:
            return Response(
                {'error': 'Company name is required for company users.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.is_superuser and not user.is_platform_maintainer:
            subscription = get_subscription_for_user(user)
            if subscription and not subscription.is_active():
                record_failed_login(email)
                return Response(
                    {'error': 'Subscription expired. Please renew to continue.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])

        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )

        redirect_url = '/dashboard.html'
        if is_platform_user:
            redirect_url = '/platform/dashboard.html'

        if user.two_factor_enabled:
            temp_token = RefreshToken.for_user(user)
            temp_token.set_exp(lifetime=timedelta(minutes=5))

            return Response({
                'requires_2fa': True,
                'temp_token': str(temp_token.access_token),
                'message': 'Please enter your 2FA code',
                'tenant_slug': tenant_slug or (user.company.slug if user.company else None),
                'company_name': user.company.name if user.company else None,
            }, status=status.HTTP_200_OK)

        access_token = RefreshToken.for_user(user)
        access_token.set_exp(lifetime=timedelta(minutes=15))

        company_name = user.company.name if user.company else None
        company_slug = user.company.slug if user.company else None

        return Response({
            'message': 'Login successful',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': get_user_role(user),
            'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
            'tenant_slug': company_slug,
            'company_name': company_name,
            'schema_name': company_slug,
            **user_role_flags(user),
            'can_view_financials': user.can_view_financials(),
            'can_manage_users': user.can_manage_users(),
            'can_delete_records': user.can_delete_records(),
            'two_factor_enabled': user.two_factor_enabled,
            'redirect_url': redirect_url,
            'refresh': str(RefreshToken.for_user(user)),
            'access': str(access_token.access_token),
        }, status=status.HTTP_200_OK)


class PlatformLoginView(APIView):
    """
    Platform Login View for Platform Operators.
    URL: /login/_admin/
    Only accepts: platform_operator, platform_support, superuser
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Show platform login page"""
        return _frontend_auth_redirect('/login.html')

    def post(self, request):
        """Handle platform operator login"""
        from django.utils import timezone

        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        client_ip = get_client_ip(request)

        is_locked, _ = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': 'Too many failed attempts. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            user = None

        if user is None:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        is_platform_user = user.is_platform_user or user.is_platform_maintainer

        if not is_platform_user:
            record_failed_login(email)
            return Response(
                {'error': 'Platform users must login at /login/_admin/'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': 'Account is locked. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        user_auth = authenticate(username=user.username, password=password)

        if user_auth is None:
            record_failed_login(email)

            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = timezone.now() + timedelta(minutes=15)
            user.save()

            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is not active.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])

        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )

        if user.two_factor_enabled:
            temp_token = RefreshToken.for_user(user)
            temp_token.set_exp(lifetime=timedelta(minutes=5))

            return Response({
                'requires_2fa': True,
                'temp_token': str(temp_token.access_token),
                'message': 'Please enter your 2FA code',
            }, status=status.HTTP_200_OK)

        access_token = RefreshToken.for_user(user)
        access_token.set_exp(lifetime=timedelta(minutes=15))

        return Response({
            'message': 'Login successful',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': get_user_role(user),
            'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
            **user_role_flags(user),
            'two_factor_enabled': user.two_factor_enabled,
            'redirect_url': '/platform/dashboard.html',
            'refresh': str(RefreshToken.for_user(user)),
            'access': str(access_token.access_token),
        }, status=status.HTTP_200_OK)


class TenantRegisterView(APIView):
    """
    Tenant-specific registration view.
    Creates a new user within an existing tenant/company.
    Only available if tenant allows user registration.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, tenant_slug):
        """Show tenant-specific registration page"""
        try:
            from companies.models import Company
            company = Company.objects.get(slug=tenant_slug)

            allow_registration = company.settings.get('allow_registration', False)
            if not allow_registration:
                return _frontend_auth_redirect(
                    '/register.html',
                    error='Registration is not allowed for this company.',
                    company_name=company.name,
                    tenant_slug=tenant_slug,
                )

            if not company.is_active:
                return _frontend_auth_redirect(
                    '/register.html',
                    error='This company account is not active.',
                    company_name=company.name,
                    tenant_slug=tenant_slug,
                )

            return _frontend_auth_redirect(
                '/register.html',
                tenant_slug=tenant_slug,
                company_name=company.name,
            )

        except Company.DoesNotExist:
            return _frontend_auth_redirect('/register.html', error='Company not found.')

    def post(self, request, tenant_slug):
        """Register a new user within the tenant"""
        from companies.models import Company

        try:
            company = Company.objects.get(slug=tenant_slug)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Invalid tenant'},
                status=status.HTTP_400_BAD_REQUEST
            )

        allow_registration = company.settings.get('allow_registration', False)
        if not allow_registration:
            return Response(
                {'error': 'Registration is not allowed for this company'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not company.can_add_user(max_users=3):
            return Response(
                {'error': 'User limit reached. Maximum 3 users allowed per company.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        full_name = request.data.get('full_name', '')
        email = request.data.get('email')
        phone = request.data.get('phone', '')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        role = normalize_tenant_role(request.data.get('role'), default='trader')

        if not all([email, password, confirm_password]):
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password != confirm_password:
            return Response(
                {'error': 'Passwords do not match'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            return Response(
                {'error': error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'error': 'Email already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_roles = ['trader', 'store']
        if role not in valid_roles:
            role = 'trader'

        try:
            user = User.objects.create_user(
                username=email.split('@')[0].replace('.', '_') + '_' + tenant_slug,
                email=email,
                password=password,
                phone=phone,
                company=company,
                role=role,
                is_active=True,
                first_name=full_name.split()[0] if full_name else '',
                last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
            )

            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'Registration successful',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': role,
                },
                'tenant_slug': tenant_slug,
                'company_name': company.name,
                'redirect_url': '/dashboard.html',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Registration failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
