import logging
import re

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.validators import EmailValidator, validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.views.generic import RedirectView
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta
from django.utils import timezone

from ..utils import (
    get_client_ip,
    user_role_flags,
    normalize_tenant_role,
    validate_password_strength,
    get_tokens_for_user,
    get_user_role,
)
from ..models_audit import AuditLog
from ..models import PhoneOTPChallenge

User = get_user_model()
logger = logging.getLogger(__name__)

PHONE_PATTERN = r'^[0-9]{10}$'


class UserRegistrationView(APIView):
    """
    Register a new tenant (Company Creation Flow)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):  # noqa: C901
        from companies.models import Company
        from django.utils.text import slugify

        verification_token = request.data.get('verification_token')

        if verification_token:
            owner_name = request.data.get('name', '').strip()
            shop_name = request.data.get('shop_name', '').strip()
            phone = ''.join(char for char in str(request.data.get('phone', '')).strip() if char.isdigit())
            location = request.data.get('location', '').strip()

            if len(phone) == 12 and phone.startswith('91'):
                phone = phone[2:]

            if not owner_name or not shop_name or not phone:
                return Response(
                    {'error': 'Owner name, shop name, and phone number are required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not re.match(PHONE_PATTERN, phone):
                return Response(
                    {'error': 'Phone must be 10 digits'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            otp_challenge = PhoneOTPChallenge.objects.filter(
                token=verification_token,
                phone=phone,
                is_used=False,
            ).first()

            if not otp_challenge or otp_challenge.is_expired() or not otp_challenge.verified_at:
                return Response(
                    {'error': 'Phone verification expired. Please request a new OTP.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if User.objects.filter(phone=phone).exists():
                return Response(
                    {'error': 'Phone number already registered'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            company_slug = slugify(shop_name)
            base_slug = company_slug or f"shop-{phone[-4:]}"
            company_slug = base_slug
            counter = 1
            while Company.objects.filter(slug=company_slug).exists():
                company_slug = f"{base_slug}-{counter}"
                counter += 1

            username_base = f"owner_{phone}"
            username = username_base
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{username_base}_{counter}"
                counter += 1

            try:
                company = Company.objects.create(
                    name=shop_name,
                    slug=company_slug,
                    city=location,
                    phone=phone,
                    is_active=True,
                    is_verified=True,
                    verification_date=timezone.now(),
                )

                user = User(
                    username=username,
                    phone=phone,
                    company=company,
                    role='tenant_admin',
                    is_active=True,
                    first_name=owner_name.split()[0] if owner_name else '',
                    last_name=' '.join(owner_name.split()[1:]) if len(owner_name.split()) > 1 else '',
                )
                user.set_unusable_password()
                user.save()

                company.admin = user
                company.save(update_fields=['admin'])

                AuditLog.objects.create(
                    user=user,
                    tenant=company,
                    action='create',
                    model_name='User',
                    object_id=user.id,
                    object_repr=f"{user.username} ({user.role})",
                    changes={'phone': user.phone, 'role': user.role, 'company': company.name},
                    ip_address=get_client_ip(request) if hasattr(request, 'META') else None
                )

                from subscriptions.models import Subscription, SubscriptionTier
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

                Subscription.objects.create(
                    tenant=user,
                    company=company,
                    tier=free_tier,
                    status='active',
                    start_date=timezone.now(),
                    expiry_date=timezone.now() + timedelta(days=14),
                )

                otp_challenge.is_used = True
                otp_challenge.save(update_fields=['is_used', 'updated_at'])

                tokens = get_tokens_for_user(user)
                return Response({
                    'message': 'Account created successfully',
                    'user_id': user.id,
                    'username': user.username,
                    'phone': user.phone,
                    'role': get_user_role(user),
                    'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
                    'tenant_slug': company.slug,
                    'company_name': company.name,
                    'schema_name': company.slug,
                    **user_role_flags(user),
                    'two_factor_enabled': user.two_factor_enabled,
                    'redirect_url': '/dashboard.html',
                    **tokens,
                }, status=status.HTTP_201_CREATED)
            except Exception as exc:
                logger.error(f"OTP registration failed: {str(exc)}")
                return Response(
                    {'error': 'Registration failed. Please try again or contact support.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        company_name = request.data.get('company_name', '').strip()
        city = request.data.get('city', '').strip()
        phone = request.data.get('phone', '').strip()
        gst_number = request.data.get('gst_number', '').strip()

        full_name = request.data.get('full_name', '').strip()
        email = request.data.get('email', '').strip().lower()
        admin_phone = request.data.get('admin_phone', '').strip()
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

        if not all([company_name, email, password, confirm_password]):
            return Response(
                {'error': 'Company name, email, and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(company_name) < 3:
            return Response(
                {'error': 'Company name must be at least 3 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email_validator = EmailValidator()
        try:
            email_validator(email)
        except DjangoValidationError:
            return Response(
                {'error': 'Invalid email format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if gst_number:
            gst_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
            if not re.match(gst_pattern, gst_number):
                return Response(
                    {'error': 'Invalid GST number format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if phone:
            if not re.match(r'^[0-9]{10}$', phone):
                return Response(
                    {'error': 'Phone must be 10 digits'},
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

        company_slug = slugify(company_name)

        base_slug = company_slug
        counter = 1
        while Company.objects.filter(slug=company_slug).exists():
            company_slug = f"{base_slug}-{counter}"
            counter += 1

        try:
            company = Company.objects.create(
                name=company_name,
                slug=company_slug,
                city=city,
                phone=phone,
                gst_number=gst_number,
                is_active=True
            )

            user = User.objects.create_user(
                username=email.split('@')[0].replace('.', '_') + '_' + company_slug,
                email=email,
                password=password,
                phone=admin_phone or phone,
                company=company,
                role='tenant_admin',
                is_active=True,
                first_name=full_name.split()[0] if full_name else '',
                last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
            )

            company.admin = user
            company.save(update_fields=['admin'])

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

            from subscriptions.models import Subscription, SubscriptionTier
            try:
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

                Subscription.objects.create(
                    tenant=user,
                    company=company,
                    tier=free_tier,
                    status='active',
                    start_date=timezone.now(),
                    expiry_date=timezone.now() + timedelta(days=14),
                )
            except Exception as sub_error:
                # Log subscription provisioning failure
                logger.error(f"Failed to provision free-tier subscription for company {company.id}: {str(sub_error)}")
                
                # Rollback user and company creation on subscription failure
                user.delete()
                company.delete()
                
                return Response(
                    {'error': 'Registration failed: unable to provision subscription. Please try again or contact support.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

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
            logger.error(f"Registration failed: {str(e)}")
            
            return Response(
                {'error': 'Registration failed. Please try again or contact support.'},
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
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone,
            'phone_number': user.phone,
            'schema_name': user.company.slug if user.company else user.schema_name,
            'company_name': user.company.name if user.company else None,
            'role': user.role,
            'role_display': user.get_role_display() if hasattr(user, 'get_role_display') else user.role,
            **user_role_flags(user),
            'is_active': user.is_active,
            'is_suspended': user.is_suspended,
            'two_factor_enabled': user.two_factor_enabled,
            'date_joined': user.date_joined,
            
            # Extended Profile Fields
            'department': user.department,
            'employee_id': user.employee_id,
            'staff_id': user.staff_id,
            'timezone': user.timezone,
            'language': user.language,
            'theme': user.theme,
            'address': user.address,
            'emergency_contact': user.emergency_contact,
            'photo_url': user.photo.url if user.photo else None,
            
            # Preferences & Permissions
            'work_preferences': user.work_preferences_json,
            'notification_settings': user.notification_settings_json,
            'granular_permissions': user.granular_permissions,
        })

    def put(self, request):
        """Update user profile"""
        user = request.user

        first_name = request.data.get('first_name', user.first_name)
        last_name = request.data.get('last_name', user.last_name)
        email = request.data.get('email', user.email)
        phone = request.data.get('phone', user.phone) or request.data.get('phone_number', user.phone)

        # Validate email format using Django's built-in validator
        if email:
            try:
                validate_email(email)
            except DjangoValidationError:
                return Response(
                    {'error': 'Invalid email format'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Validate phone format (10 digits)
        if phone and not re.match(PHONE_PATTERN, str(phone)):
            return Response(
                {'error': 'Phone must be 10 digits'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check email uniqueness (excluding current user)
        if email and email != user.email:
            if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response(
                    {'error': 'Email already in use by another account'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.phone = phone
        
        # Extended Fields
        if 'department' in request.data: user.department = request.data['department']
        if 'employee_id' in request.data: user.employee_id = request.data['employee_id']
        if 'staff_id' in request.data: user.staff_id = request.data['staff_id']
        if 'timezone' in request.data: user.timezone = request.data['timezone']
        if 'language' in request.data: user.language = request.data['language']
        if 'theme' in request.data: user.theme = request.data['theme']
        if 'address' in request.data: user.address = request.data['address']
        if 'emergency_contact' in request.data: user.emergency_contact = request.data['emergency_contact']
        if 'work_preferences' in request.data: user.work_preferences_json = request.data['work_preferences']
        if 'notification_settings' in request.data: user.notification_settings_json = request.data['notification_settings']

        update_fields = [
            'first_name', 'last_name', 'email', 'phone', 
            'department', 'employee_id', 'staff_id', 'timezone', 
            'language', 'theme', 'address', 'emergency_contact',
            'work_preferences_json', 'notification_settings_json'
        ]
        user.save(update_fields=update_fields)

        return Response({
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone': user.phone,
                'department': user.department,
                'timezone': user.timezone,
                'language': user.language,
                'theme': user.theme,
            }
        })


class UserListView(APIView):
    """List all users (admin only)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_superuser:
            queryset = User.objects.all()
        elif user.is_platform_user:
            queryset = User.objects.filter(role__in=['platform_operator', 'platform_support'])
        elif user.is_tenant_admin:
            queryset = User.objects.filter(company=user.company)
        else:
            return Response(
                {'error': 'Only tenant admins or platform users can list users'},
                status=status.HTTP_403_FORBIDDEN
            )

        users = queryset.order_by('id').values(
            'id', 'username', 'email', 'phone',
            'is_active', 'date_joined', 'role',
            'company__name'
        )
        payload = []
        for entry in users:
            row = dict(entry)
            row['company_name'] = row.pop('company__name', None)
            payload.append(row)
        return Response(payload)


class TenantUserManagementView(APIView):
    """
    Manage users within a tenant (Tenant Admin only)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """List users in the same tenant"""
        user = request.user

        if not user.is_tenant_admin:
            return Response(
                {'error': 'Only Tenant Admins can list users'},
                status=status.HTTP_403_FORBIDDEN
            )

        users = User.objects.filter(company=request.user.company).values(
            'id', 'username', 'email', 'phone', 'role',
            'is_active', 'date_joined', 'last_login',
            'granular_permissions', 'company__name'
        )
        payload = []
        for entry in users:
            row = dict(entry)
            row['company_name'] = row.pop('company__name', None)
            payload.append(row)
        return Response(payload)

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

        valid_roles = [
            'tenant_admin', 'branch_manager', 'finance_manager', 'accountant',
            'purchase_manager', 'auction_manager', 'inventory_manager',
            'supervisor', 'sales_staff', 'trader', 'store', 'staff', 'viewer'
        ]
        if role not in valid_roles:
            return Response(
                {'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {'error': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not password:
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            password = ''.join(secrets.choice(alphabet) for i in range(10))

        new_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            phone=phone,
            company=request.user.company,
            role=role,
            granular_permissions=request.data.get('granular_permissions', {})
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

        if (user_to_update.company_id if user_to_update.company else None) != (request.user.company_id if request.user.company else None):
            return Response(
                {'error': 'Cannot modify users from other tenants'},
                status=status.HTTP_403_FORBIDDEN
            )

        if user_to_update.id == request.user.id:
            return Response(
                {'error': 'Cannot modify your own account here'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if 'is_active' in request.data:
            user_to_update.is_active = request.data['is_active']

        if 'role' in request.data:
            new_role = normalize_tenant_role(request.data['role'], default='')
            valid_roles = [
                'tenant_admin', 'branch_manager', 'finance_manager', 'accountant',
                'purchase_manager', 'auction_manager', 'inventory_manager',
                'supervisor', 'sales_staff', 'trader', 'store', 'staff', 'viewer'
            ]
            if new_role not in valid_roles:
                return Response(
                    {'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user_to_update.role = new_role

        if 'granular_permissions' in request.data:
            user_to_update.granular_permissions = request.data['granular_permissions']

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

        if 'is_suspended' in request.data:
            user_to_update.is_suspended = request.data['is_suspended']

        if 'granular_permissions' in request.data:
            user_to_update.granular_permissions = request.data['granular_permissions']

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

        if user_to_delete.id == request.user.id:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if (user_to_delete.company_id if user_to_delete.company else None) != (request.user.company_id if request.user.company else None):
            return Response(
                {'error': 'Cannot delete users from other tenants'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_to_delete.delete()

        return Response({
            'message': 'User deleted successfully'
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': 'Both old_password and new_password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify old password
        if not user.check_password(old_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Validate new password strength
        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password == old_password:
            return Response(
                {'error': 'New password must be different from current password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response({
            'message': 'Password changed successfully'
        })

class CustomProfileRedirectView(LoginRequiredMixin, RedirectView):
    """
    Redirects authenticated users from /accounts/profile/ to the API profile endpoint.
    """
    permanent = False

    def get_redirect_url(self):
        return "/api/auth/profile/"

class DeviceSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from accounts.models import DeviceSession
        sessions = DeviceSession.objects.filter(user=request.user)
        payload = []
        for s in sessions:
            payload.append({
                'id': s.id,
                'ip_address': s.ip_address,
                'user_agent': s.user_agent,
                'device_type': s.device_type,
                'location': s.location,
                'last_activity': s.last_activity,
                'is_current': request.session.session_key == s.session_key if hasattr(request, 'session') else False
            })
        return Response(payload)

    def delete(self, request):
        from accounts.models import DeviceSession
        from django.contrib.sessions.models import Session
        
        session_id = request.data.get('session_id')
        
        if session_id == 'all':
            devices = DeviceSession.objects.filter(user=request.user)
            # Cannot accurately filter standard django sessions by user easily without this model,
            # so we just delete all sessions tracked by DeviceSession
            for device in devices:
                if not hasattr(request, 'session') or device.session_key != request.session.session_key:
                    Session.objects.filter(session_key=device.session_key).delete()
                    device.delete()
            return Response({'message': 'All other devices logged out.'})
        
        try:
            device = DeviceSession.objects.get(id=session_id, user=request.user)
            Session.objects.filter(session_key=device.session_key).delete()
            device.delete()
            return Response({'message': 'Device logged out.'})
        except DeviceSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)
