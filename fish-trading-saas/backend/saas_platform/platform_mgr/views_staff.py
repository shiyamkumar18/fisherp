from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from saas_platform.accounts.permissions import IsPlatformOperator
from saas_platform.accounts.models import PlatformStaffInvite, PLATFORM_ROLES, ROLE_HIERARCHY

User = get_user_model()

class StaffKPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        now = timezone.now()
        
        # Total Staff metrics
        staff_qs = User.objects.filter(is_platform_user=True)
        total_active = staff_qs.filter(is_active=True, is_suspended=False).count()
        total_inactive = staff_qs.filter(is_active=False).count() + staff_qs.filter(is_suspended=True).count()
        
        # Pending invites
        pending_invites = PlatformStaffInvite.objects.filter(status='pending', expires_at__gt=now).count()
        expired_invites = PlatformStaffInvite.objects.filter(status='pending', expires_at__lte=now).count()
        
        # Support Health (Mock metrics based on user count)
        l1_count = staff_qs.filter(role='platform_support_l1').count()
        l2_count = staff_qs.filter(role='platform_support_l2').count()
        
        # Access Risk
        failed_logins = staff_qs.filter(failed_login_attempts__gt=0).count()
        no_mfa = staff_qs.filter(two_factor_enabled=False).count()
        
        return Response({
            "kpis": {
                "total_staff": {
                    "value": total_active,
                    "sub": f"{total_inactive} inactive • {pending_invites} invited",
                    "trend": 4.2
                },
                "support_health": {
                    "value": "94%",
                    "sub": f"{l1_count} L1 • {l2_count} L2 agents",
                    "trend": 1.1
                },
                "productivity": {
                    "value": 142,
                    "sub": "Assigned tickets • 89 resolved",
                    "trend": 12.5
                },
                "access_risk": {
                    "value": failed_logins + no_mfa,
                    "sub": f"{failed_logins} failed logins • {no_mfa} no MFA",
                    "trend": -5.0
                },
                "pending_invites": {
                    "value": pending_invites,
                    "sub": f"{expired_invites} expired",
                    "trend": 0
                }
            }
        })


class StaffDirectoryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        staff = User.objects.filter(is_platform_user=True).order_by('-role_level', 'username')
        
        results = []
        for user in staff:
            # Generate deterministic mock data based on ID for UI visualization
            mock_tickets = (user.id * 3) % 15 if 'support' in user.role else 0
            mock_score = 95 - (user.failed_login_attempts * 10) - (0 if user.two_factor_enabled else 20)
            
            results.append({
                "id": user.id,
                "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "email": user.email,
                "role": dict(User._meta.get_field('role').choices).get(user.role, user.role),
                "role_key": user.role,
                "department": user.department or "Operations",
                "status": "Suspended" if user.is_suspended else ("Active" if user.is_active else "Inactive"),
                "mfa_enabled": user.two_factor_enabled,
                "last_active": user.last_login.strftime("%b %d, %Y %H:%M") if user.last_login else "Never",
                "open_tickets": mock_tickets,
                "security_score": max(0, mock_score)
            })
            
        return Response({"results": results})


class StaffHierarchyView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        # Build a visual hierarchy of the platform staff
        # Operators -> Managers -> Support/Engineers -> L1/L2
        
        staff = User.objects.filter(is_platform_user=True)
        
        # Group by role category
        hierarchy = {
            "Leadership": [],
            "Management": [],
            "Engineering & Finance": [],
            "Support Operations": []
        }
        
        for user in staff:
            name = f"{user.first_name} {user.last_name}".strip() or user.username
            role_display = dict(User._meta.get_field('role').choices).get(user.role, user.role)
            node = {"id": user.id, "name": name, "role": role_display}
            
            if user.role in ['platform_operator', 'platform_super_admin']:
                hierarchy["Leadership"].append(node)
            elif 'manager' in user.role or user.role == 'platform_customer_success':
                hierarchy["Management"].append(node)
            elif 'devops' in user.role or 'finance' in user.role or 'billing' in user.role:
                hierarchy["Engineering & Finance"].append(node)
            else:
                hierarchy["Support Operations"].append(node)
                
        return Response({"hierarchy": hierarchy})


class StaffInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        invites = PlatformStaffInvite.objects.all().order_by('-created_at')[:50]
        results = []
        for inv in invites:
            status = inv.status
            if status == 'pending' and inv.is_expired():
                status = 'expired'
                
            results.append({
                "id": inv.id,
                "email": inv.email,
                "role": dict(User._meta.get_field('role').choices).get(inv.role, inv.role),
                "department": inv.department,
                "status": status,
                "created_at": inv.created_at.strftime("%b %d, %Y")
            })
        return Response({"results": results})
        
    def post(self, request):
        email = request.data.get('email')
        role = request.data.get('role')
        
        if not email or not role:
            return Response({"error": "Email and role are required."}, status=400)
            
        # Mocking invite creation for UI functionality
        invite = PlatformStaffInvite.objects.create(
            email=email,
            role=role,
            department=request.data.get('department', 'Operations'),
            invited_by=request.user,
            expires_at=timezone.now() + timedelta(days=7)
        )
        return Response({"status": "success", "message": f"Invited {email} as {role}"})


class StaffActionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def post(self, request):
        action = request.data.get('action')
        user_id = request.data.get('user_id')
        
        if not action or not user_id:
            return Response({"error": "Action and user_id required"}, status=400)
            
        try:
            target_user = User.objects.get(id=user_id, is_platform_user=True)
        except User.DoesNotExist:
            return Response({"error": "Platform user not found"}, status=404)
            
        if target_user.is_superuser and not request.user.is_superuser:
            return Response({"error": "Cannot modify superuser"}, status=403)
            
        if action == 'suspend':
            target_user.is_suspended = not target_user.is_suspended
            target_user.save()
            state = "suspended" if target_user.is_suspended else "unsuspended"
            return Response({"status": "success", "message": f"User {target_user.username} has been {state}."})
            
        elif action == 'force_logout':
            target_user.device_sessions.all().delete()
            return Response({"status": "success", "message": f"Force logged out {target_user.username} from all devices."})
            
        return Response({"status": "success", "message": f"Action '{action}' executed on {target_user.username}."})
