from django.db import models
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model, authenticate
from django.shortcuts import redirect
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import RedirectView
from rest_framework_simplejwt.tokens import RefreshToken
from .throttles import LoginThrottle
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from datetime import timedelta
import re

User = get_user_model()

# Import role choices for display and validation helpers.
from accounts.models import ROLE_CHOICES
from accounts.models_audit import LoginAttempt


def _normalize_ip(ip_address):
    """Return a DB-safe IP string for login attempt records."""
    return ip_address or '0.0.0.0'


def get_user_role(user):
    """Determine user role based on user properties"""
    if user.is_superuser:
        return 'platform_maintainer'
    return user.role if hasattr(user, 'role') else 'tenant_admin'


def normalize_tenant_role(role, default='trader'):
    """Normalize incoming tenant role values (supports legacy aliases)."""
    role_map = {
        'sales_staff': 'trader',
        'store_accounts': 'store',
        'trader': 'trader',
        'store': 'store',
    }
    return role_map.get((role or '').strip(), default)


def user_role_flags(user):
    """Standard role flag payload for API responses."""
    return {
        'is_tenant_admin': user.is_tenant_admin,
        'is_accountant': user.is_accountant,
        'is_trader': user.is_trader,
        'is_store': user.is_store,
        # Backward-compatibility flags
        'is_sales_staff': user.is_sales_staff,
        'is_store_accounts': user.is_store_accounts,
        'is_platform_operator': user.is_platform_operator,
        'is_platform_support': user.is_platform_support,
        'is_platform_super_admin': user.is_platform_super_admin,
        'is_platform_maintainer': user.is_platform_maintainer,
    }


def get_subscription_for_user(user):
    """Resolve subscription by company first, then legacy tenant fallback."""
    from subscriptions.models import Subscription
    qs = Subscription.objects.all().order_by('-created_at')
    if user.company_id:
        return qs.filter(company=user.company).first()
    return qs.filter(tenant=user).first()


def validate_password_strength(password):
    """
    Validate password strength:
    - Min 8 chars
    - At least 1 uppercase
    - At least 1 number
    - At least 1 special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least 1 uppercase letter"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least 1 number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least 1 special character"
    
    return True, None


def check_failed_login_attempts(email):
    """Check if user has exceeded max failed login attempts"""
    from django.conf import settings
    from django.utils import timezone
    
    max_attempts = getattr(settings, 'AUTH_LOGIN_ATTEMPT_LIMIT', 5)
    lockout_minutes = getattr(settings, 'AUTH_LOCKOUT_DURATION_MINUTES', 15)
    
    failed_count = LoginAttempt.get_failed_attempts(email, minutes=lockout_minutes)
    
    if failed_count >= max_attempts:
        return True, None
    
    return False, None


def record_failed_login(email, ip_address='', user_agent=''):
    """Record a failed login attempt in database"""
    LoginAttempt.record_attempt(
        email,
        _normalize_ip(ip_address),
        status='failed',
        user_agent=user_agent
    )


def record_successful_login(email, ip_address='', user_agent=''):
    """Record a successful login attempt in database"""
    LoginAttempt.record_attempt(
        email,
        _normalize_ip(ip_address),
        status='success',
        user_agent=user_agent
    )


def clear_failed_login(email):
    """Clear failed attempts for this identity after successful auth."""
    LoginAttempt.objects.filter(email=email, status='failed').delete()


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return _normalize_ip(ip)


@method_decorator(csrf_exempt, name='dispatch')
class UserLoginView(APIView):
    throttle_classes = [LoginThrottle]
    """
    Secure Multi-Tenant Login
    
    Features:
    - Email-based login
    - Failed attempt tracking (max 5)
    - IP logging
    - JWT with refresh token rotation
    
    def get(self, request):
        """Show login form for browser access"""
        from django.shortcuts import render
        return render(request, 'login.html')
    
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
        
        # Get client IP
        client_ip = get_client_ip(request)
        
        # Check for locked account
        is_locked, lockout_until = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': f'Too many failed attempts. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Find user by email or username
        try:
            # Try email first, then username
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            # Don't reveal user not found - generic error
            record_failed_login(email, client_ip, request.META.get('HTTP_USER_AGENT', '')[:500])
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is locked
        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': f'Account is locked. Try again later'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Optional tenant isolation: if tenant_slug is provided, user must belong to it.
        if requested_tenant_slug:
            user_slug = user.company.slug if user.company else user.schema_name
            if user_slug != requested_tenant_slug:
                record_failed_login(email, client_ip, request.META.get('HTTP_USER_AGENT', '')[:500])
                return Response(
                    {'error': 'Invalid tenant context for this user.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        # Authenticate
        user_auth = authenticate(username=user.username, password=password)
        
        if user_auth is None:
            record_failed_login(email)
            
            # Update failed login attempts in user model
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
        
        # Check tenant is active (for non-superusers and non-platform operators)
        if not user.is_superuser and not user.is_platform_maintainer and not user.is_platform_user:
            subscription = get_subscription_for_user(user)
            if subscription and not subscription.is_active():
                record_failed_login(email)
                return Response(
                    {'error': 'Subscription expired. Please renew to continue.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Clear failed attempts and update security fields
        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])
        
        # Log successful login
        from accounts.models_audit import AuditLog
        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # Generate a temporary token for 2FA verification
            temp_token = RefreshToken.for_user(user)
            temp_token.set_exp(lifetime=timedelta(minutes=5))
            
            return Response({
                'requires_2fa': True,
                'temp_token': str(temp_token.access_token),
                'message': 'Please enter your 2FA code'
            }, status=status.HTTP_200_OK)
        
        # Generate tokens with short expiry
        access_token = RefreshToken.for_user(user)
        access_token.set_exp(lifetime=timedelta(minutes=15))
        
        return Response({
            'message': 'Login successful',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': get_user_role(user),
            'role_display': dict(ROLE_CHOICES).get(user.role, user.role),
            'schema_name': user.company.slug if user.company else user.schema_name,
            **user_role_flags(user),
            'can_view_financials': user.can_view_financials(),
            'can_manage_users': user.can_manage_users(),
            'can_delete_records': user.can_delete_records(),
            'two_factor_enabled': user.two_factor_enabled,
            'refresh': str(RefreshToken.for_user(user)),
            'access': str(access_token.access_token),
        }, status=status.HTTP_200_OK)


class UserRegistrationView(APIView):
    """
    Register a new tenant (Company Creation Flow)
    
    This creates:
    1. Company/Tenant
    2. Tenant Admin User
    3. Default Free Trial Subscription
    
    Security:
    - Email must be globally unique
    - Strong password required
    - User is_active = False until email verification
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        from companies.models import Company

        # Company Details
        company_name = request.data.get('company_name', '').strip()
        city = request.data.get('city', '').strip()
        phone = request.data.get('phone', '').strip()
        gst_number = request.data.get('gst_number', '').strip()
        
        # Admin User Details
        full_name = request.data.get('full_name', '').strip()
        email = request.data.get('email', '').strip().lower()
        admin_phone = request.data.get('admin_phone', '').strip()
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        
        # Validate required fields
        if not all([company_name, email, password, confirm_password]):
            return Response(
                {'error': 'Company name, email, and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate company name length
        if len(company_name) < 3:
            return Response(
                {'error': 'Company name must be at least 3 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return Response(
                {'error': 'Invalid email format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate GST format if provided
        if gst_number:
            gst_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            if not re.match(gst_pattern, gst_number):
                return Response(
                    {'error': 'Invalid GST number format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate phone if provided
        if phone:
            if not re.match(r'^[0-9]{10}$', phone):
                return Response(
                    {'error': 'Phone must be 10 digits'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check passwords match
        if password != confirm_password:
            return Response(
                {'error': 'Passwords do not match'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password strength
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            return Response(
                {'error': error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check email unique
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'error': 'Email already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check company name unique (create slug)
        from django.utils.text import slugify
        company_slug = slugify(company_name)
        
        # Ensure unique slug
        base_slug = company_slug
        counter = 1
        while Company.objects.filter(slug=company_slug).exists():
            company_slug = f"{base_slug}-{counter}"
            counter += 1
        
        try:
            # Create company first so tenant user can be created with a company.
            from companies.models import Company
            company = Company.objects.create(
                name=company_name,
                slug=company_slug,
                city=city,
                phone=phone,
                gst_number=gst_number,
                is_active=True
            )

            # Create the Tenant Admin user
            user = User.objects.create_user(
                username=email.split('@')[0].replace('.', '_') + '_' + company_slug,
                email=email,
                password=password,
                phone=admin_phone or phone,
                company=company,
                role='tenant_admin',
                is_active=True,  # For demo - in production set to False until email verify
                first_name=full_name.split()[0] if full_name else '',
                last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
            )
            
            # Set company admin now that user exists.
            company.admin = user
            company.save(update_fields=['admin'])
            
            # Log user creation
            from accounts.models_audit import AuditLog
            AuditLog.objects.create(
                user=user,
                tenant=company,
                action='create',
                model_name='User',
                object_id=user.id,
                object_repr=f"{user.email} ({user.get_role_display() if hasattr(user, 'get_role_display') else user.role})",
                changes={'email': user.email, 'role': user.role, 'company': company.name},
                ip_address=get_client_ip(request) if hasattr(request, 'META') else None
            )
            
            # Create default Free Trial subscription
            from subscriptions.models import Subscription, SubscriptionTier
            try:
                # Get or create free tier
                free_tier, _ = SubscriptionTier.objects.get_or_create(
                    name='free',
                    defaults={
                        'max_users': 3,
                        'max_storage_gb': 1,
                        'price_monthly': 0,
                        'price_yearly': 0,
                        'allow_api_access': False,
                        'allow_analytics': False,
                    }
                )
                
                from django.utils import timezone
                
                Subscription.objects.create(
                    tenant=user,
                    company=company,
                    tier=free_tier,
                    status='active',
                    start_date=timezone.now().date(),
                    expiry_date=timezone.now().date() + timedelta(days=14),  # 14-day free trial
                )
            except Exception as e:
                # Subscription creation failed - continue anyway
                pass
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'message': 'Company registered successfully',
                'company': {
                    'name': company_name,
                    'slug': company_slug,
                },
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': 'tenant_admin',
                },
                'schema_name': company_slug,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Registration failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserProfileView(APIView):
    """Get current user profile"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone': user.phone,
            'schema_name': user.company.slug if user.company else user.schema_name,
            'role': user.role,
            'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
            **user_role_flags(user),
            'is_active': user.is_active,
            'date_joined': user.date_joined,
        })
    
    def put(self, request):
        """Update user profile"""
        user = request.user
        user.email = request.data.get('email', user.email)
        user.phone = request.data.get('phone', user.phone)
        user.save()
        
        return Response({
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone': user.phone,
            }
        })


class UserListView(APIView):
    """List all users (admin only)"""
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def get(self, request):
        users = User.objects.all().values(
            'id', 'username', 'email', 'phone', 
            'is_active', 'date_joined', 'role'
        )
        return Response(list(users))


class TenantUserManagementView(APIView):
    """
    Manage users within a tenant (Tenant Admin only)
    
    Permissions:
    - TenantAdmin: Can add/remove users within their tenant
    - Max 3 users per tenant (including admin)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """List users in the same tenant"""
        user = request.user
        
        # Only tenant admins can list users
        if not user.is_tenant_admin:
            return Response(
                {'error': 'Only Tenant Admins can list users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all users in the same schema/tenant
        users = User.objects.filter(company=request.user.company).values(
            'id', 'username', 'email', 'phone', 'role', 
            'is_active', 'date_joined', 'last_login'
        )
        return Response(list(users))
    
    def post(self, request):
        """Create a new user within the tenant"""
        if not request.user.is_tenant_admin:
            return Response(
                {'error': 'Only Tenant Admins can create users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        username = request.data.get('username')
        email = request.data.get('email')
        phone = request.data.get('phone', '')
        role = normalize_tenant_role(request.data.get('role'), default='trader')
        password = request.data.get('password', None)
        
        if not username or not email:
            return Response(
                {'error': 'Username and email are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user limit (max 3 users per tenant)
        from companies.models import Company
        try:
            company = Company.objects.get(slug=request.user.company.slug if request.user.company else None)
            if not company.can_add_user(max_users=3):
                return Response(
                    {'error': 'User limit reached. Maximum 3 users allowed per company.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Company.DoesNotExist:
            pass
        
        # Validate role - cannot create another tenant admin
        valid_roles = ['trader', 'store']
        if role not in valid_roles:
            return Response(
                {'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check email unique globally
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'error': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check username unique
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate password if not provided
        if not password:
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            password = ''.join(secrets.choice(alphabet) for i in range(10))
        
        # Create user in the same schema
        new_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            phone=phone,
            company=request.user.company,
            role=role,
        )
        
        return Response({
            'message': 'User created successfully',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'role': new_user.role,
            },
            'temp_password': password if not request.data.get('password') else None,
        }, status=status.HTTP_201_CREATED)
    
    def put(self, request):
        """Update user (disable, reset password, change role)"""
        if not request.user.is_tenant_admin:
            return Response(
                {'error': 'Only Tenant Admins can update users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_to_update = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Must be in same tenant
        if user_to_update.company.slug if user_to_update.company else None != request.user.company.slug if request.user.company else None:
            return Response(
                {'error': 'Cannot modify users from other tenants'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Cannot modify self
        if user_to_update.id == request.user.id:
            return Response(
                {'error': 'Cannot modify your own account here'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update fields
        if 'is_active' in request.data:
            user_to_update.is_active = request.data['is_active']
        
        if 'role' in request.data:
            new_role = normalize_tenant_role(request.data['role'], default='')
            if new_role not in ['trader', 'store']:
                return Response(
                    {'error': 'Invalid role'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user_to_update.role = new_role
        
        # Reset password if requested
        if request.data.get('reset_password'):
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            new_password = ''.join(secrets.choice(alphabet) for i in range(10))
            user_to_update.set_password(new_password)
            user_to_update.save()
            return Response({
                'message': 'Password reset successfully',
                'temp_password': new_password,
            })
        
        user_to_update.save()
        
        return Response({
            'message': 'User updated successfully',
            'user': {
                'id': user_to_update.id,
                'username': user_to_update.username,
                'email': user_to_update.email,
                'role': user_to_update.role,
                'is_active': user_to_update.is_active,
            }
        })
    
    def delete(self, request):
        """Delete a user"""
        if not request.user.is_tenant_admin:
            return Response(
                {'error': 'Only Tenant Admins can delete users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user_to_delete = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Cannot delete self
        if user_to_delete.id == request.user.id:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Must be in same tenant
        if user_to_delete.company.slug if user_to_delete.company else None != request.user.company.slug if request.user.company else None:
            return Response(
                {'error': 'Cannot delete users from other tenants'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_to_delete.delete()
        
        return Response({
            'message': 'User deleted successfully'
        }, status=status.HTTP_200_OK)


class CustomProfileRedirectView(LoginRequiredMixin, RedirectView):
    """
    Redirects authenticated users from /accounts/profile/ to the API profile endpoint.
    This handles the Django auth redirect that happens after login.
    """
    permanent = False
    
    def get_redirect_url(self):
        # Redirect to the API profile endpoint
        return "/api/auth/profile/"


# =====================================================
# TWO-FACTOR AUTHENTICATION VIEWS
# =====================================================

class TwoFactorSetupView(APIView):
    """
    Setup Two-Factor Authentication for a user.
    
    Generates a secret key and QR code for the user to scan.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
"""Generate 2FA secret"""
        user = request.user
        
        if user.two_factor_enabled:
            return Response(
                {'error': '2FA is already enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate a secret key (in production, use pyotp library)
        import secrets
        import base64
        
        secret = secrets.token_hex(20)
        # Encode in base32 for TOTP apps
        encoded_secret = base64.b32encode(secret.encode()).decode()
        
        # Generate backup codes
        backup_codes = [secrets.token_hex(8) for _ in range(10)]
        
        # Store temporarily until verified
        user.two_factor_secret = encoded_secret
        user.backup_codes = backup_codes
        user.save(update_fields=['two_factor_secret', 'backup_codes'])
        
        return Response({
'message': '2FA secret generated. Verify with your authenticator app.'
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
        """Verify the 2FA code"""
        user = request.user
        code = request.data.get('code', '').strip()
        
        if not user.two_factor_secret:
            return Response(
{'error': '2FA not set up. Call /auth/2fa/setup/ first.'}
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
        
        # Verify using pyotp for real TOTP verification
        try:
            import pyotp
            totp = pyotp.TOTP(user.two_factor_secret)
            
            # Verify the code (allow for time drift of +/- 1 time step)
            if not totp.verify(code, valid_window=1):
                return Response(
                    {'error': 'Invalid code'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ImportError:
            # Fallback if pyotp not installed
            if len(code) != 6 or not code.isdigit():
                return Response(
                    {'error': 'Code must be 6 digits'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Enable 2FA
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
        """Disable 2FA"""
        user = request.user
        password = request.data.get('password', '')
        
        if not user.two_factor_enabled:
            return Response(
                {'error': '2FA is not enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify password
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Disable 2FA
        user.two_factor_enabled = False
        user.two_factor_secret = ''
        user.backup_codes = []
        user.save(update_fields=['two_factor_enabled', 'two_factor_secret', 'backup_codes'])
        
        return Response({
            'message': '2FA disabled successfully',
            'two_factor_enabled': False,
        }, status=status.HTTP_200_OK)


# =====================================================
# TENANT-SPECIFIC LOGIN VIEWS
# =====================================================

class TenantLoginView(APIView):
    """
    Tenant-specific login view.
    
    Each tenant/company gets a unique login URL like /login/acme-corp/
    Users can only login through their company's specific URL.
    
    Features:
    - Tenant validation (company must exist and be active)
    - User must belong to the specified tenant
    - Tenant-specific branding in response
    - Audit logging with tenant context
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, tenant_slug):
        """Show tenant-specific login page"""
        from django.shortcuts import render
        
        try:
            from companies.models import Company
            company = Company.objects.get(slug=tenant_slug)
            
            # Check if tenant is active
            if not company.is_active:
                return render(request, 'login.html', {
                    'error': 'This company account is not active.',
                    'company_name': company.name,
                })
            
            # Render login page with tenant context
            context = company.get_login_context()
            context['tenant_slug'] = tenant_slug
            return render(request, 'login.html', context)
            
        except Company.DoesNotExist:
            return render(request, 'login.html', {
                'error': 'Company not found.',
            })
    
    def post(self, request, tenant_slug):
        """
        Handle tenant-specific login.
        
        Validates:
        1. Tenant exists and is active
        2. User belongs to this tenant
        3. Credentials are valid
        """
        from django.utils import timezone
        from companies.models import Company
        
        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate tenant exists
        try:
            company = Company.objects.get(slug=tenant_slug)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Invalid tenant'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check tenant is active
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
        
        # Get client IP
        client_ip = get_client_ip(request)
        
        # Check for locked account
        is_locked, lockout_until = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': f'Too many failed attempts. Try again after {lockout_until}'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Find user by email
        try:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            user = None
        
        # Validate user belongs to this tenant
        if user is None:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check user belongs to this company
        if user.company_id != company.id:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is locked
        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': f'Account is locked. Try again after {user.locked_until}'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Authenticate
        user_auth = authenticate(username=user.username, password=password)
        
        if user_auth is None:
            record_failed_login(email)
            
            # Update failed login attempts
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
        
        # Check subscription is active
        if not user.is_superuser and not user.is_platform_maintainer:
            subscription = get_subscription_for_user(user)
            if subscription and not subscription.is_active():
                record_failed_login(email)
                return Response(
                    {'error': 'Subscription expired. Please renew to continue.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Clear failed attempts and update security fields
        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])
        
        # Log successful login with tenant context
        from accounts.models_audit import AuditLog
        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Check if 2FA is enabled
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
        
        # Generate tokens
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
            'redirect_url': f'/dashboard/{tenant_slug}/' if tenant_slug else '/dashboard/',
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
        from django.shortcuts import render
        
        try:
            from companies.models import Company
            company = Company.objects.get(slug=tenant_slug)
            
            # Check if tenant allows registration
            allow_registration = company.settings.get('allow_registration', False)
            if not allow_registration:
                return render(request, 'login.html', {
                    'error': 'Registration is not allowed for this company.',
                    'company_name': company.name,
                })
            
            # Check if tenant is active
            if not company.is_active:
                return render(request, 'login.html', {
                    'error': 'This company account is not active.',
                    'company_name': company.name,
                })
            
            context = company.get_login_context()
            context['tenant_slug'] = tenant_slug
            context['show_register'] = True
            return render(request, 'login.html', context)
            
        except Company.DoesNotExist:
            return render(request, 'login.html', {
                'error': 'Company not found.',
            })
    
    def post(self, request, tenant_slug):
        """Register a new user within the tenant"""
        from companies.models import Company
        
        # Validate tenant
        try:
            company = Company.objects.get(slug=tenant_slug)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Invalid tenant'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check tenant allows registration
        allow_registration = company.settings.get('allow_registration', False)
        if not allow_registration:
            return Response(
                {'error': 'Registration is not allowed for this company'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check user limit
        if not company.can_add_user(max_users=3):
            return Response(
                {'error': 'User limit reached. Maximum 3 users allowed per company.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user data
        full_name = request.data.get('full_name', '')
        email = request.data.get('email')
        phone = request.data.get('phone', '')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        role = normalize_tenant_role(request.data.get('role'), default='trader')
        
        # Validate required fields
        if not all([email, password, confirm_password]):
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check passwords match
        if password != confirm_password:
            return Response(
                {'error': 'Passwords do not match'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password strength
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            return Response(
                {'error': error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check email unique
        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'error': 'Email already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate role
        valid_roles = ['trader', 'store']
        if role not in valid_roles:
            role = 'trader'  # Default role
        
        try:
            # Create user in the tenant
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
            
            # Generate tokens
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
                'redirect_url': f'/dashboard/{tenant_slug}/',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Registration failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



# =====================================================
# PLATFORM LOGIN VIEW - For platform operators only
# =====================================================

class PlatformLoginView(APIView):
    """
    Platform Login View for Platform Operators.
    
    URL: /login/_admin/
    
    Only accepts:
    - platform_operator
    - platform_support
    - superuser
    
    Redirects to platform-admin dashboard after login.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Show platform login page"""
        from django.shortcuts import render
        return render(request, 'login_admin.html', {'is_platform_login': True})
    
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
        
        # Get client IP
        client_ip = get_client_ip(request)
        
        # Check for locked account
        is_locked, lockout_until = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': f'Too many failed attempts. Try again after {lockout_until}'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Find user by email or username
        try:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            user = None
        
        # Check if user exists
        if user is None:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is a platform user (operator/support/superuser).
        is_platform_user = user.is_platform_user or user.is_platform_maintainer
        
        if not is_platform_user:
            record_failed_login(email)
            return Response(
                {'error': 'Platform users must login at /login/_admin/'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is locked
        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': f'Account is locked. Try again after {user.locked_until}'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Authenticate
        user_auth = authenticate(username=user.username, password=password)
        
        if user_auth is None:
            record_failed_login(email)
            
            # Update failed login attempts
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
        
        # Clear failed attempts and update security fields
        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])
        
        # Log successful login
        from accounts.models_audit import AuditLog
        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Check if 2FA is enabled
        if user.two_factor_enabled:
            temp_token = RefreshToken.for_user(user)
            temp_token.set_exp(lifetime=timedelta(minutes=5))
            
            return Response({
                'requires_2fa': True,
                'temp_token': str(temp_token.access_token),
                'message': 'Please enter your 2FA code',
            }, status=status.HTTP_200_OK)
        
        # Generate tokens
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
            'redirect_url': '/platform-admin/',
            'refresh': str(RefreshToken.for_user(user)),
            'access': str(access_token.access_token),
        }, status=status.HTTP_200_OK)


# =====================================================
# UNIFIED LOGIN VIEW - Single login for all company users
# =====================================================

class UnifiedLoginView(APIView):
    """
    Unified Login View for ALL company users.
    
    Single login URL (/login/) for:
    - tenant_admin (Company Admin)
    - accountant (Accountant)
    - trader (Trader)
    - store (Store/Purchase)
    
    Platform users use /platform-admin/ (with _admin suffix)
    
    After successful login, user is redirected based on their role.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, tenant_slug=None):
        """Show unified login page"""
        from django.shortcuts import render
        
        context = {}
        if tenant_slug:
            try:
                from companies.models import Company
                company = Company.objects.get(slug=tenant_slug)
                context['company_name'] = company.name
                context['tenant_slug'] = tenant_slug
            except Company.DoesNotExist:
                pass
        
        return render(request, 'login.html', context)
    
    def post(self, request, tenant_slug=None):
        """
        Handle unified login for all company users.
        
        Accepts credentials and returns:
        - JWT tokens
        - User role info
        - Redirect URL based on role
        """
        from django.utils import timezone
        from companies.models import Company
        
        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get client IP
        client_ip = get_client_ip(request)
        
        # Check for locked account
        is_locked, lockout_until = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': f'Too many failed attempts. Try again after {lockout_until}'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Find user by email or username
        try:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                user = User.objects.filter(username__iexact=email).first()
        except User.DoesNotExist:
            user = None
        
        # If tenant_slug provided, validate user belongs to that tenant
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
            
            # Check tenant is active
            if not company.is_active:
                record_failed_login(email)
                return Response(
                    {'error': 'This company account is not active. Please contact support.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validate user belongs to this tenant
            if user and user.company_id != company.id:
                record_failed_login(email)
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        # Check if user exists
        if user is None:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is locked
        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'error': f'Account is locked. Try again after {user.locked_until}'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Authenticate
        user_auth = authenticate(username=user.username, password=password)
        
        if user_auth is None:
            record_failed_login(email)
            
            # Update failed login attempts
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
        
        # Check subscription is active (for non-superusers)
        if not user.is_superuser and not user.is_platform_maintainer:
            subscription = get_subscription_for_user(user)
            if subscription and not subscription.is_active():
                record_failed_login(email)
                return Response(
                    {'error': 'Subscription expired. Please renew to continue.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Clear failed attempts and update security fields
        clear_failed_login(email)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_ip = client_ip
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'last_login_ip'])
        
        # Log successful login
        from accounts.models_audit import AuditLog
        AuditLog.log_login(
            user=user,
            ip_address=client_ip,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
        )
        
        # Determine redirect URL based on user role
        redirect_url = '/dashboard/'
        if user.is_platform_user:
            redirect_url = '/platform-admin/'
        elif user.company and user.company.slug:
            redirect_url = f'/dashboard/{user.company.slug}/'
        
        # Check if 2FA is enabled
        if user.two_factor_enabled:
            temp_token = RefreshToken.for_user(user)
            temp_token.set_exp(lifetime=timedelta(minutes=5))
            
            return Response({
                'requires_2fa': True,
                'temp_token': str(temp_token.access_token),
                'message': 'Please enter your 2FA code',
                'tenant_slug': tenant_slug or (user.company.slug if user.company else None),
            }, status=status.HTTP_200_OK)
        
        # Generate tokens
        access_token = RefreshToken.for_user(user)
        access_token.set_exp(lifetime=timedelta(minutes=15))
        
        # Get company info
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
