import logging
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import PlatformStaffInvite, PLATFORM_ROLES
from accounts.permissions import IsPlatformSuperAdmin
from accounts.models_audit import AuditLog

logger = logging.getLogger(__name__)
User = get_user_model()


class InvitePlatformStaffView(APIView):
    """
    Super Admin can invite new platform staff via secure email token.
    """
    permission_classes = [IsAuthenticated, IsPlatformSuperAdmin]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', '')
        department = request.data.get('department', '')

        if not email or not role:
            return Response(
                {'error': 'Email and role are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if role not in PLATFORM_ROLES:
            return Response(
                {'error': 'Invalid platform role.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'User with this email already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Invalidate any existing pending invites for this email
        PlatformStaffInvite.objects.filter(email=email, status='pending').update(status='revoked')

        invite = PlatformStaffInvite.objects.create(
            email=email,
            role=role,
            department=department,
            invited_by=request.user,
            expires_at=timezone.now() + timedelta(days=3)
        )

        # Log action
        AuditLog.log_update(
            user=request.user,
            model_name='PlatformStaffInvite',
            object_id=invite.id,
            object_repr=invite.email,
            changes={'action': 'invite_sent', 'role': role},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        # TODO: Integrate real SMTP to send email containing token (invite.token)
        # mock_send_email(email, invite.token)

        return Response({
            'message': 'Invitation sent successfully.',
            'invite_id': invite.id,
            'token': str(invite.token)  # Returned here for development/testing
        }, status=status.HTTP_201_CREATED)


class AcceptPlatformInviteView(APIView):
    """
    Invited user submits the token and their new password.
    """
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        token = request.data.get('token')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()

        if not token or not password:
            return Response(
                {'error': 'Token and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters long.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            invite = PlatformStaffInvite.objects.get(token=token)
        except PlatformStaffInvite.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired invitation token.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not invite.is_valid():
            return Response(
                {'error': 'This invitation has expired or was already used/revoked.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=invite.email).exists():
            return Response(
                {'error': 'An account with this email already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the platform user
        username = invite.email.split('@')[0].replace('.', '_') + '_admin'
        
        # Ensure username uniqueness
        counter = 1
        base_username = username
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=invite.email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=invite.role,
            department=invite.department,
            is_active=True
        )

        invite.status = 'accepted'
        invite.save(update_fields=['status', 'updated_at'])

        # Audit
        AuditLog.log_update(
            user=user,
            model_name='User',
            object_id=user.id,
            object_repr=user.username,
            changes={'action': 'invite_accepted', 'role': user.role},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'message': 'Account created successfully. You can now log in.'
        }, status=status.HTTP_201_CREATED)
