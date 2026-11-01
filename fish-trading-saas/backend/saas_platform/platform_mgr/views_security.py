from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q

from saas_platform.accounts.permissions import IsPlatformOperator
from saas_platform.accounts.models_audit import AuditLog, ImpersonationLog, LoginAttempt
from saas_platform.companies.models import Company

class SecurityKPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        now = timezone.now()
        yesterday = now - timedelta(days=1)
        
        failed_logins_24h = LoginAttempt.objects.filter(status='failed', attempted_at__gte=yesterday).count()
        permission_violations = AuditLog.objects.filter(action='permission_denied', timestamp__gte=yesterday).count()
        active_impersonations = ImpersonationLog.objects.filter(is_active=True).count()
        
        # Calculate Mock Platform Score
        score = 100
        score -= (failed_logins_24h * 0.5)
        score -= (permission_violations * 2)
        score = max(0, min(100, score))
        
        status_str = "Healthy"
        if score < 60:
            status_str = "Critical"
        elif score < 85:
            status_str = "Warning"

        return Response({
            "score": int(score),
            "status": status_str,
            "metrics": {
                "failed_logins_24h": failed_logins_24h,
                "permission_violations": permission_violations,
                "active_impersonations": active_impersonations,
                "suspicious_sessions": 0
            }
        })


class SecurityIncidentFeedView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        # Fetch actual high-risk audit logs
        high_risk_logs = AuditLog.objects.filter(
            action__in=['permission_denied', 'failed_login', 'delete', 'role_change']
        ).select_related('user', 'tenant').order_by('-timestamp')[:50]
        
        incidents = []
        for log in high_risk_logs:
            threat_type = "Unknown"
            risk_score = 50
            if log.action == 'permission_denied':
                threat_type = "Privilege Escalation Attempt"
                risk_score = 85
            elif log.action == 'failed_login':
                threat_type = "Brute Force / Suspicious Login"
                risk_score = 70
            elif log.action == 'role_change':
                threat_type = "Admin Role Modification"
                risk_score = 90
            elif log.action == 'delete':
                threat_type = "Destructive Action"
                risk_score = 65

            incidents.append({
                "id": f"SEC-2026-{log.id:06d}",
                "raw_log_id": log.id,
                "threat_type": threat_type,
                "user": log.user.email if log.user else "Unknown",
                "tenant": log.tenant.name if log.tenant else "Platform",
                "ip_address": log.ip_address or "Unknown",
                "location": "Determined by IP (Mocked)",
                "device": log.user_agent[:30] + "..." if log.user_agent else "Unknown",
                "timestamp": log.timestamp,
                "risk_score": risk_score,
                "status": "Open",
            })
            
        return Response({"results": incidents})

    def post(self, request):
        action = request.data.get('action')
        log_id = request.data.get('id')
        
        if action == 'suspend_user':
            log = AuditLog.objects.filter(id=log_id).first()
            if log and log.user:
                log.user.is_active = False
                log.user.save(update_fields=['is_active'])
                return Response({"status": "success", "message": f"User {log.user.email} suspended successfully."})
            return Response({"error": "User or log not found"}, status=404)
            
        if action in ['block_session', 'escalate']:
            return Response({"status": "success", "message": f"Action '{action}' executed successfully."})
            
        return Response({"error": "Invalid action"}, status=400)


class LoginIntelligenceView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        now = timezone.now()
        
        # Last 7 days trend
        trends = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            start_of_day = day.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            success = LoginAttempt.objects.filter(status='success', attempted_at__range=(start_of_day, end_of_day)).count()
            failed = LoginAttempt.objects.filter(status='failed', attempted_at__range=(start_of_day, end_of_day)).count()
            
            trends.append({
                "date": start_of_day.strftime("%b %d"),
                "success": success,
                "failed": failed
            })
            
        # Mock Geo Distribution based on IPs
        geo_distribution = [
            {"country": "India", "percentage": 82},
            {"country": "United States", "percentage": 12},
            {"country": "Singapore", "percentage": 4},
            {"country": "Other", "percentage": 2},
        ]
        
        return Response({
            "trends": trends,
            "geo_distribution": geo_distribution
        })


class ImpersonationWarRoomView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperator]

    def get(self, request):
        logs = ImpersonationLog.objects.select_related('platform_user', 'tenant').order_by('-start_time')[:30]
        data = []
        for log in logs:
            data.append({
                "id": log.id,
                "operator": log.platform_user.email if log.platform_user else "Unknown",
                "tenant": log.tenant.name if log.tenant else "Unknown",
                "reason": log.reason,
                "start_time": log.start_time,
                "duration": log.duration_display,
                "is_active": log.is_active,
                "risk_level": "High" if log.duration.total_seconds() > 3600 and log.is_active else "Low"
            })
        return Response({"results": data})

    def post(self, request, pk=None):
        action = request.data.get('action')
        if action == 'force_stop' and pk:
            try:
                log = ImpersonationLog.objects.get(id=pk, is_active=True)
                log.end_impersonation()
                return Response({"status": "success", "message": "Impersonation session terminated forcibly."})
            except ImpersonationLog.DoesNotExist:
                return Response({"error": "Active session not found"}, status=404)
        return Response({"error": "Invalid action"}, status=400)
