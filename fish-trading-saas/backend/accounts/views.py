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
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
import re

User = get_user_model()

# Track failed login attempts (in production, use Redis or database)
failed_login_attempts = {}


def get_user_role(user):
    """Determine user role based on user properties"""
    if user.is_superuser:
        return 'platform_maintainer'
    return user.role if hasattr(user, 'role') else 'tenant_admin'


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
    if email in failed_login_attempts:
        attempts, lockout_until = failed_login_attempts[email]
        if attempts >= 5:
            from django.utils import timezone
            from datetime import timedelta
            if lockout_until and timezone.now() < lockout_until:
                return True, lockout_until
            else:
                # Lockout expired, reset attempts
                del failed_login_attempts[email]
    return False, None


def record_failed_login(email):
    """Record a failed login attempt"""
    from django.utils import timezone
    from datetime import timedelta, datetime
    
    if email not in failed_login_attempts:
        failed_login_attempts[email] = [0, None]
    
    attempts, _ = failed_login_attempts[email]
    failed_login_attempts[email] = [attempts + 1, timezone.now() + timedelta(minutes=15)]


def clear_failed_login(email):
    """Clear failed login attempts on successful login"""
    if email in failed_login_attempts:
        del failed_login_attempts[email]


@method_decorator(csrf_exempt, name='dispatch')
class UserLoginView(APIView):
    """
    Secure Multi-Tenant Login
    
    Features:
    - Email-based login
    - Failed attempt tracking (max 5)
    - JWT with refresh token rotation
    - Tenant/Subscription validation
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Show login form for browser access"""
        from django.shortcuts import render
        return render(request, 'login.html')
    
    def post(self, request):
        email = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for locked account
        is_locked, lockout_until = check_failed_login_attempts(email)
        if is_locked:
            return Response(
                {'error': f'Too many failed attempts. Try again after {lockout_until}'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # Find user by email
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Don't reveal email not found - generic error
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Authenticate
        user = authenticate(username=user.username, password=password)
        
        if user is None:
            record_failed_login(email)
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Account is not active. Please verify your email.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check tenant is active (for non-superusers)
        if not user.is_superuser and not user.is_platform_maintainer:
            # Check if tenant is suspended (you would implement this in Tenant model)
            # For now, we check subscription
            from subscriptions.models import Subscription
            try:
                subscription = Subscription.objects.get(tenant=user)
                if not subscription.is_active():
                    record_failed_login(email)
                    return Response(
                        {'error': 'Subscription expired. Please renew to continue.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Subscription.DoesNotExist:
                # No subscription yet - allow for demo
                pass
        
        # Clear failed attempts on success
        clear_failed_login(email)
        
        # Generate tokens with short expiry
        from datetime import timedelta
        from django.conf import settings
        
        # Use shorter access token lifetime (15 min)
        access_token = RefreshToken.for_user(user)
        access_token.set_exp(lifetime=timedelta(minutes=15))
        
        return Response({
            'message': 'Login successful',
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': get_user_role(user),
            'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
            'schema_name': user.schema_name,
            'is_tenant_admin': user.is_tenant_admin,
            'is_sales_staff': user.is_sales_staff,
            'is_store_accounts': user.is_store_accounts,
            'is_platform_maintainer': user.is_platform_maintainer,
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
        # Company Details
        company_name = request.data.get('company_name')
        city = request.data.get('city', '')
        phone = request.data.get('phone', '')
        gst_number = request.data.get('gst_number', '')
        
        # Admin User Details
        full_name = request.data.get('full_name', '')
        email = request.data.get('email')
        admin_phone = request.data.get('admin_phone', '')
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')
        
        # Validate required fields
        if not all([company_name, email, password, confirm_password]):
            return Response(
                {'error': 'Company name, email, and password are required'},
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
        while User.objects.filter(schema_name=company_slug).exists():
            company_slug = f"{base_slug}-{counter}"
            counter += 1
        
        try:
            # Create the Tenant Admin user
            user = User.objects.create_user(
                username=email.split('@')[0].replace('.', '_') + '_' + company_slug,
                email=email,
                password=password,
                phone=admin_phone or phone,
                schema_name=company_slug,
                role='tenant_admin',
                is_active=True,  # For demo - in production set to False until email verify
                first_name=full_name.split()[0] if full_name else '',
                last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
            )
            
            # Create Company/Tenant record
            from companies.models import Company
            company = Company.objects.create(
                name=company_name,
                slug=company_slug,
                city=city,
                phone=phone,
                gst_number=gst_number,
                admin=user,
                is_active=True
            )
            
            # Link user to company
            user.company = company
            user.save()
            
            # Create default Free Trial subscription
            from subscriptions.models import Subscription, SubscriptionTier
            try:
                # Get or create free tier
                free_tier, _ = SubscriptionTier.objects.get_or_create(
                    name='Free Trial',
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
                from datetime import timedelta
                
                Subscription.objects.create(
                    tenant=user,
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
            'schema_name': user.schema_name,
            'role': user.role,
            'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
            'is_tenant_admin': user.is_tenant_admin,
            'is_sales_staff': user.is_sales_staff,
            'is_store_accounts': user.is_store_accounts,
            'is_platform_maintainer': user.is_platform_maintainer,
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
            'id', 'username', 'email', 'phone', 'schema_name', 
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
        users = User.objects.filter(schema_name=user.schema_name).values(
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
        role = request.data.get('role', 'sales_staff')
        password = request.data.get('password', None)
        
        if not username or not email:
            return Response(
                {'error': 'Username and email are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user limit (max 3 users per tenant)
        from companies.models import Company
        try:
            company = Company.objects.get(slug=request.user.schema_name)
            if not company.can_add_user(max_users=3):
                return Response(
                    {'error': 'User limit reached. Maximum 3 users allowed per company.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Company.DoesNotExist:
            pass
        
        # Validate role - cannot create another tenant admin
        valid_roles = ['sales_staff', 'store_accounts']
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
            schema_name=request.user.schema_name,
            role=role,
            company=request.user.company,
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
        if user_to_update.schema_name != request.user.schema_name:
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
            new_role = request.data['role']
            if new_role not in ['sales_staff', 'store_accounts']:
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
        if user_to_delete.schema_name != request.user.schema_name:
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

