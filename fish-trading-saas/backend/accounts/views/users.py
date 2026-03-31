# accounts/views/users.py

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import RedirectView
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta
from django.utils import timezone

from ..utils import (
    get_client_ip,
    user_role_flags,
    normalize_tenant_role,
    validate_password_strength,
)
from ..models_audit import AuditLog

User = get_user_model()


class UserRegistrationView(APIView):
    """
    Register a new tenant (Company Creation Flow)
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):  # noqa: C901
        from companies.models import Company

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

        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
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

        from django.utils.text import slugify
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
                import logging
                logger = logging.getLogger(__name__)
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
            import logging
            logger = logging.getLogger(__name__)
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
            'is_active', 'date_joined', 'role'
        )
        return Response(list(users))


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

        valid_roles = ['trader', 'store']
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
            if new_role not in ['trader', 'store']:
                return Response(
                    {'error': 'Invalid role'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user_to_update.role = new_role

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


class CustomProfileRedirectView(LoginRequiredMixin, RedirectView):
    """
    Redirects authenticated users from /accounts/profile/ to the API profile endpoint.
    """
    permanent = False

    def get_redirect_url(self):
        return "/api/auth/profile/"
