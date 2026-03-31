from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.throttling import UserRateThrottle
from django.contrib.auth import get_user_model
from django.utils import timezone
from companies.models import Company
from accounts.models_audit import ImpersonationLog, AuditLog
import uuid

User = get_user_model()


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class PlatformImpersonationPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated and (
                request.user.is_superuser
                or getattr(request.user, "is_platform_operator", False)
                or getattr(request.user, "is_platform_maintainer", False)
                or getattr(request.user, "is_platform_support", False)
            )
        )


class SimpleImpersonationThrottle(UserRateThrottle):
    scope = "impersonate"


class ImpersonationAPIView(APIView):
    permission_classes = [PlatformImpersonationPermission]
    throttle_classes = [SimpleImpersonationThrottle]

    def get(self, request):
        active_logs = ImpersonationLog.objects.filter(
            platform_user=request.user,
            is_active=True
        ).select_related("tenant", "impersonated_user")

        data = []
        for log in active_logs:
            data.append({
                "id": log.id,
                "tenant": getattr(log.tenant, "name", str(log.tenant)) if log.tenant else None,
                "tenant_slug": getattr(log.tenant, "slug", None) if log.tenant else None,
                "impersonated_user": log.impersonated_user.username if log.impersonated_user else None,
                "reason": log.reason,
                "start_time": log.start_time,
                "ip_address": log.ip_address,
            })

        return Response({
            "active_impersonations": data,
            "count": len(data),
        })

    def post(self, request):
        tenant_slug = request.data.get("tenant_slug")
        user_id = request.data.get("user_id")
        reason = request.data.get("reason")

        if not reason or len(reason.strip()) < 10:
            return Response(
                {"error": "Reason required (min 10 chars) for audit trail"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (tenant_slug or user_id):
            return Response(
                {"error": "tenant_slug or user_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if tenant_slug:
                tenant = Company.objects.get(slug=tenant_slug)
                impersonated_user = tenant.admin
            else:
                impersonated_user = User.objects.get(id=user_id)
                tenant = impersonated_user.company

            if not impersonated_user:
                return Response(
                    {"error": "Tenant does not have an admin user to impersonate"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not tenant.is_active:
                return Response(
                    {"error": "Tenant inactive"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            client_ip = get_client_ip(request)
            session_id = request.session.session_key or str(uuid.uuid4())

            log = ImpersonationLog.objects.create(
                platform_user=request.user,
                tenant=tenant,
                impersonated_user=impersonated_user,
                reason=reason,
                ip_address=client_ip,
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                start_time=timezone.now(),
                is_active=True,
                session_id=session_id,
            )

            try:
                AuditLog.log_impersonation_start(
                    platform_user=request.user,
                    tenant=tenant,
                    reason=reason,
                    ip_address=client_ip,
                )
            except Exception:
                pass

            request.session["impersonation_log_id"] = log.id
            request.session["impersonation_id"] = log.id
            request.session["impersonating_tenant_id"] = tenant.id
            request.session["impersonating_tenant_slug"] = tenant.slug
            request.session["impersonating_user_id"] = impersonated_user.id
            request.session["impersonation_start_time"] = log.start_time.isoformat()
            request.session.modified = True

            return Response({
                "message": "Impersonation started",
                "log_id": log.id,
                "tenant_slug": tenant.slug,
                "tenant_name": tenant.name,
                "impersonated_user": impersonated_user.username,
                "reason": reason,
                "session_id": log.session_id,
                "warning": "End session when done via DELETE",
            }, status=status.HTTP_200_OK)

        except Company.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({"error": "Failed to start impersonation"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        impersonation_id = request.session.get("impersonation_log_id") or request.session.get("impersonation_id")
        if not impersonation_id:
            return Response({"error": "No active impersonation"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            log = ImpersonationLog.objects.get(
                id=impersonation_id,
                platform_user=request.user,
                is_active=True,
            )
            log.end_time = timezone.now()
            log.is_active = False
            log.save(update_fields=["end_time", "is_active"])

            try:
                AuditLog.log_impersonation_end(
                    platform_user=request.user,
                    tenant=log.tenant,
                )
            except Exception:
                pass

            request.session.pop("impersonation_log_id", None)
            request.session.pop("impersonation_id", None)
            request.session.pop("impersonating_tenant_id", None)
            request.session.pop("impersonating_tenant_slug", None)
            request.session.pop("impersonating_user_id", None)
            request.session.pop("impersonation_start_time", None)
            request.session.modified = True

            return Response({
                "message": "Impersonation ended",
                "log_id": log.id,
                "duration_seconds": (
                    log.end_time - log.start_time
                ).total_seconds() if log.end_time and log.start_time else 0,
            })

        except ImpersonationLog.DoesNotExist:
            return Response(
                {"error": "Impersonation not found or already ended"},
                status=status.HTTP_404_NOT_FOUND,
            )
