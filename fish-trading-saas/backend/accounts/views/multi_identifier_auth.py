"""
Multi-Identifier Authentication System
Supports login via: Email, Phone, or Company Name
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from django.db.models import Q
from companies.models import Company
from ..utils import get_client_ip, check_failed_login_attempts, record_failed_login
import jwt
import json
from datetime import timedelta

User = get_user_model()


def detect_identifier_type(identifier):
    """
    Detect what type of identifier was provided
    Returns: 'email', 'phone', or 'company_name'
    """
    identifier = (identifier or "").strip()
    
    # Check if email (contains @)
    if "@" in identifier:
        return "email"
    
    # Check if phone (all digits, possibly with +)
    if identifier.replace("+", "").replace(" ", "").replace("-", "").isdigit():
        return "phone"
    
    # Otherwise treat as company name
    return "company_name"


def find_user_by_identifier(identifier):
    """
    Find user by any identifier type (email, phone, or company name)
    Returns: User object or None
    """
    identifier = (identifier or "").strip()
    id_type = detect_identifier_type(identifier)
    
    # Email lookup
    if id_type == "email":
        return User.objects.filter(email__iexact=identifier).first()
    
    # Phone lookup
    elif id_type == "phone":
        normalized_phone = identifier.replace("+", "").replace(" ", "").replace("-", "")
        return User.objects.filter(
            Q(phone__iendswith=normalized_phone[-10:]) |  # Match last 10 digits
            Q(phone__iexact=normalized_phone)
        ).first()
    
    # Company name lookup - find company, then get its admin user
    else:
        company = Company.objects.filter(
            Q(name__iexact=identifier) |
            Q(slug__iexact=identifier)
        ).first()
        
        if company and company.admin:
            return company.admin
        
        return None


class MultiIdentifierLoginView(APIView):
    """
    New unified login endpoint supporting Email/Phone/Company Name
    
    Request:
    {
        "identifier": "shiyam@gmail.com" or "9876543210" or "Shiyam Fish Traders",
        "password": "123456"
    }
    
    Response:
    {
        "access": "jwt_token",
        "refresh": "refresh_token",
        "user": {
            "id": 1,
            "username": "shiyam",
            "email": "shiyam@gmail.com",
            "phone": "9876543210",
            "name": "Shiyam Kumar",
            "role": "tenant_admin",
            "company": {
                "id": 1,
                "name": "Shiyam Fish Traders",
                "slug": "shiyam-fish-traders"
            }
        },
        "message": "Login successful"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Handle login with multi-identifier support"""
        identifier = request.data.get('identifier', '').strip()
        password = request.data.get('password', '').strip()

        # Validation
        if not identifier or not password:
            return Response(
                {
                    'error': 'Identifier (email/phone/company) and password are required',
                    'code': 'missing_fields'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check rate limiting
        is_locked, retry_after = check_failed_login_attempts(identifier)
        if is_locked:
            return Response(
                {
                    'error': f'Too many failed attempts. Try again in {retry_after} seconds.',
                    'code': 'account_locked',
                    'retry_after': retry_after
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Find user by identifier
        user = find_user_by_identifier(identifier)
        
        if not user:
            record_failed_login(identifier)
            return Response(
                {
                    'error': 'Account not found. Check your email, phone, or company name.',
                    'code': 'user_not_found'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if user is active
        if not user.is_active:
            return Response(
                {
                    'error': 'This account is inactive. Contact support.',
                    'code': 'user_inactive'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify password
        if not user.check_password(password):
            record_failed_login(identifier)
            return Response(
                {
                    'error': 'Invalid credentials. Check your identifier and password.',
                    'code': 'invalid_password'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if user's company is active (for tenant users)
        if user.company and not user.company.is_active:
            return Response(
                {
                    'error': 'Your company account is inactive. Contact support.',
                    'code': 'company_inactive'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if company is verified (for new companies)
        if user.company and not user.company.is_verified and not user.is_superuser:
            return Response(
                {
                    'error': 'Your company account is pending verification. Check your email.',
                    'code': 'company_not_verified'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Update last login tracking
        user.last_login = timezone.now()
        user.last_login_ip = get_client_ip(request)
        user.failed_login_attempts = 0
        user.save(update_fields=['last_login', 'last_login_ip', 'failed_login_attempts'])

        # Generate JWT tokens
        tokens = self._generate_tokens(user)

        # Build response
        response_data = {
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': self._serialize_user(user),
            'message': 'Login successful'
        }

        return Response(response_data, status=status.HTTP_200_OK)

    @staticmethod
    def _generate_tokens(user):
        """Generate JWT access and refresh tokens"""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(user)
        
        # Add custom claims
        refresh.payload['phone'] = user.phone
        refresh.payload['company_id'] = user.company_id
        refresh.payload['company_slug'] = user.company.slug if user.company else None
        refresh.payload['role'] = user.role
        refresh.payload['is_platform_user'] = user.is_platform_user
        
        access = refresh.access_token
        access.payload['phone'] = user.phone
        access.payload['company_id'] = user.company_id
        access.payload['company_slug'] = user.company.slug if user.company else None
        access.payload['role'] = user.role
        access.payload['is_platform_user'] = user.is_platform_user
        
        return {
            'access': str(access),
            'refresh': str(refresh)
        }

    @staticmethod
    def _serialize_user(user):
        """Serialize user data for response"""
        company_data = None
        if user.company:
            company_data = {
                'id': user.company.id,
                'name': user.company.name,
                'slug': user.company.slug,
                'is_verified': user.company.is_verified,
            }
        
        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'phone': user.phone,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'name': user.get_full_name() or user.username,
            'role': user.role,
            'company': company_data,
            'is_platform_user': user.is_platform_user,
            'two_factor_enabled': user.two_factor_enabled,
        }


class SimpleRegistrationView(APIView):
    """
    New registration endpoint supporting multi-identifier signup
    
    Request:
    {
        "first_name": "Shiyam",
        "last_name": "Kumar",
        "email": "shiyam@gmail.com",
        "phone": "9876543210",
        "company_name": "Shiyam Fish Traders",
        "password": "SecurePassword123",
        "password_confirm": "SecurePassword123"
    }
    
    Response:
    {
        "user": { user data },
        "message": "Account created successfully. Please login."
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Handle registration"""
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        email = request.data.get('email', '').strip()
        phone = request.data.get('phone', '').strip()
        company_name = request.data.get('company_name', '').strip()
        password = request.data.get('password', '').strip()
        password_confirm = request.data.get('password_confirm', '').strip()

        # Validation
        errors = {}

        if not first_name:
            errors['first_name'] = 'First name is required'
        
        if not email:
            errors['email'] = 'Email is required'
        elif not self._is_valid_email(email):
            errors['email'] = 'Invalid email format'
        elif User.objects.filter(email__iexact=email).exists():
            errors['email'] = 'Email already in use'
        
        if not phone:
            errors['phone'] = 'Phone is required'
        elif not self._is_valid_phone(phone):
            errors['phone'] = 'Invalid phone format'
        elif User.objects.filter(phone__iexact=phone).exists():
            errors['phone'] = 'Phone already in use'
        
        if not company_name:
            errors['company_name'] = 'Company name is required'
        elif len(company_name) < 2:
            errors['company_name'] = 'Company name must be at least 2 characters'
        elif Company.objects.filter(name__iexact=company_name).exists():
            errors['company_name'] = 'Company name already registered'
        
        if not password:
            errors['password'] = 'Password is required'
        elif len(password) < 8:
            errors['password'] = 'Password must be at least 8 characters'
        
        if password != password_confirm:
            errors['password_confirm'] = 'Passwords do not match'

        if errors:
            return Response(
                {'errors': errors, 'code': 'validation_error'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create company
        from django.utils.text import slugify
        slug = slugify(company_name)
        counter = 1
        base_slug = slug
        while Company.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        company = Company.objects.create(
            name=company_name,
            slug=slug,
            is_active=True,
            is_verified=False,  # Require email verification
        )

        # Create user
        username = email.split('@')[0]
        counter = 1
        base_username = username
        while User.objects.filter(username__iexact=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            phone=phone,
            first_name=first_name,
            last_name=last_name,
            password=password,
            company=company,
            role='tenant_admin',  # First user is admin
            is_active=True,
        )

        # Set company admin
        company.admin = user
        company.save()

        # TODO: Send verification email

        return Response(
            {
                'user': MultiIdentifierLoginView._serialize_user(user),
                'message': 'Account created successfully. Please login.',
                'code': 'user_created'
            },
            status=status.HTTP_201_CREATED
        )

    @staticmethod
    def _is_valid_email(email):
        """Basic email validation"""
        return "@" in email and "." in email.split("@")[1]

    @staticmethod
    def _is_valid_phone(phone):
        """Basic phone validation"""
        clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        return clean_phone.isdigit() and len(clean_phone) >= 7


class SendOTPView(APIView):
    """Send OTP to user's phone number"""
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier', '').strip()
        
        if not identifier:
            return Response({'error': 'Identifier required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user
        user = find_user_by_identifier(identifier)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify phone number exists
        if not user.phone:
            return Response({'error': 'No phone number on file'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate OTP (for demo: 123456, in production use proper OTP generation)
        import random
        otp = str(random.randint(100000, 999999))
        
        # Store OTP in session/cache (in production use Redis or database)
        request.session[f'otp_{user.id}'] = {
            'code': otp,
            'created_at': timezone.now().isoformat(),
            'attempts': 0
        }
        
        # Send SMS (commented for now - implement with Twilio/AWS SNS)
        # send_sms(user.phone, f"Your FisherP OTP: {otp}")
        
        # For demo purposes, log OTP
        print(f"[DEMO] OTP for {user.phone}: {otp}")
        
        return Response({
            'message': f'OTP sent to {user.phone}',
            'phone_masked': user.phone[-4:].rjust(len(user.phone), '*')
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    """Verify OTP and login user"""
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier', '').strip()
        otp = request.data.get('otp', '').strip()
        
        if not identifier or not otp:
            return Response({'error': 'Identifier and OTP required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find user
        user = find_user_by_identifier(identifier)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verify OTP
        stored_otp_data = request.session.get(f'otp_{user.id}')
        if not stored_otp_data:
            return Response({'error': 'OTP expired. Please request a new one'}, status=status.HTTP_400_BAD_REQUEST)
        
        if stored_otp_data['code'] != otp:
            stored_otp_data['attempts'] = stored_otp_data.get('attempts', 0) + 1
            if stored_otp_data['attempts'] >= 3:
                del request.session[f'otp_{user.id}']
                return Response({'error': 'Too many attempts. Request a new OTP'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # OTP verified - clear it and login user
        del request.session[f'otp_{user.id}']
        
        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone': user.phone,
                'role': user.role,
                'is_platform_user': user.is_platform_user,
                'company': {
                    'id': user.company.id,
                    'name': user.company.name,
                    'slug': user.company.slug
                } if user.company else None
            }
        }, status=status.HTTP_200_OK)
