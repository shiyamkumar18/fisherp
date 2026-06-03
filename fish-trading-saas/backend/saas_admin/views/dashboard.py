"""
Platform Manager Views
======================

Comprehensive platform-level management for SaaS operations.
Provides tenant management, subscription control, impersonation,
support tools, and audit logging.

Security:
- All views require platform_operator role
- Impersonation requires reason (logged)
- All actions are audit logged
- No business data visible without impersonation
"""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum, Q, Max
from django.db.models.functions import ExtractHour, ExtractWeekDay
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from decimal import Decimal
from datetime import timedelta
import secrets
import string

from accounts.permissions import IsPlatformOperator, CanUseImpersonation, IsPlatformOperatorOrReadOnlySupport
from accounts.models_audit import AuditLog, ImpersonationLog, get_client_ip
from companies.models import Company
from subscriptions.models import Subscription, SubscriptionTier
from support.models import SupportTicket

User = get_user_model()


class PlatformDashboardView(APIView):
    """
    Global platform analytics dashboard.
    
    Shows SaaS KPIs without exposing tenant business data.
    
    ✅ Shows:
    - Total tenants, active tenants, expired tenants
    - MRR (Monthly Recurring Revenue)
    - Annual revenue projection
    - New signups this month
    - Churn rate
    - Average users per tenant
    - Total API calls, storage usage
    
    ❌ Does NOT show:
    - Tenant profit data
    - Tenant customer list
    - Tenant supplier data
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # ===== TENANT STATS =====
        total_tenants = Company.objects.count()
        
        # Get active subscriptions (distinct by company)
        active_subscriptions = Subscription.objects.filter(
            status='active',
            expiry_date__gte=now
        )
        active_tenants = active_subscriptions.values('company').distinct().count()
        
        expired_tenants = Subscription.objects.filter(
            Q(status='expired') |  # noqa: W504
            Q(expiry_date__lt=now)
        ).values('company').distinct().count()
        
        suspended_tenants = Subscription.objects.filter(status='suspended').values('company').distinct().count()
        
        # ===== REVENUE STATS =====
        # MRR - Monthly Recurring Revenue (from active subscriptions)
        # Single query with select_related instead of N+1 loop
        monthly_subs = active_subscriptions.filter(
            billing_cycle='monthly'
        ).select_related('tier')
        mrr = 0.0
        for sub in monthly_subs:
            if sub.tier:
                mrr += float(sub.tier.price_monthly or 0)

        # Yearly revenue projection
        yearly_projection = mrr * 12

        # Also add yearly subscriptions
        yearly_subs = active_subscriptions.filter(
            billing_cycle='yearly'
        ).select_related('tier')
        for sub in yearly_subs:
            if sub.tier:
                price_yearly = float(sub.tier.price_yearly or 0)
                yearly_projection += price_yearly
                mrr += price_yearly / 12
        
        # ===== GROWTH STATS =====
        # New signups this month
        new_signups_this_month = Company.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        # New signups last month (for churn calculation)
        last_month_start = thirty_days_ago - timedelta(days=30)
        new_signups_last_month = Company.objects.filter(
            created_at__gte=last_month_start,
            created_at__lt=thirty_days_ago
        ).count()
        
        # Churn rate calculation
        if total_tenants > 0:
            churn_rate = (expired_tenants / total_tenants) * 100
        else:
            churn_rate = 0
        
        # ===== USAGE STATS =====
        # Total users across all tenants
        total_users = User.objects.filter(
            role__in=['tenant_admin', 'accountant', 'trader', 'store', 'sales_staff', 'store_accounts']
        ).count()
        
        # Average users per tenant
        if total_tenants > 0:
            avg_users_per_tenant = round(total_users / total_tenants, 1)
        else:
            avg_users_per_tenant = 0
        
        # Total storage used
        total_storage_mb = active_subscriptions.aggregate(
            total=Sum('storage_used_mb')
        )['total'] or 0
        
        # Total API calls this month
        total_api_calls = active_subscriptions.aggregate(
            total=Sum('api_calls_this_month')
        )['total'] or 0
        
        # Support Incidents
        active_incidents = SupportTicket.objects.filter(status__in=['open', 'in_progress', 'escalated']).count()
        
        # ===== SUBSCRIPTION TIERS BREAKDOWN =====
        # Distinct companies per tier to avoid inflating stats
        tier_breakdown_query = Subscription.objects.filter(
            status='active',
            expiry_date__gte=now,
            tier__is_active=True,
        ).values('tier__name', 'tier__price_monthly').annotate(count=Count('company', distinct=True)).order_by('tier__name')
        
        tier_breakdown = [
            {
                'tier': row['tier__name'],
                'count': row['count'],
                'price_monthly': str(row['tier__price_monthly']),
            }
            for row in tier_breakdown_query
        ]
        
        # ===== ACTIVITY RECENT =====
        recent_signups = Company.objects.prefetch_related('subscriptions').order_by('-created_at')[:5]
        recent_signup_list = []
        for company in recent_signups:
            subscription = Subscription.objects.filter(company=company).order_by('-created_at').first()
            sub_status = subscription.status if subscription else 'none'
            expiry = subscription.expiry_date if subscription else None
            
            recent_signup_list.append({
                'id': getattr(company, 'id', None),
                'name': company.name,
                'slug': company.slug,
                'created_at': company.created_at.isoformat() if company.created_at else None,
                'subscription_status': sub_status,
                'expiry_date': expiry.isoformat() if expiry else None,
            })
        # ===== RECENT TICKETS =====
        recent_tickets_qs = SupportTicket.objects.select_related('tenant', 'assignee').order_by('-created_at')[:5]
        recent_tickets = []
        for t in recent_tickets_qs:
            time_remaining = "Breached"
            if t.sla_breach_at:
                if t.sla_breach_at > now:
                    delta = t.sla_breach_at - now
                    hours = int(delta.total_seconds() / 3600)
                    time_remaining = f"{hours}h"
            else:
                time_remaining = "N/A"
                
            recent_tickets.append({
                'id': f"TCK-{t.id}",
                'tenant': t.tenant.name,
                'agent': t.assignee.username if t.assignee else 'Unassigned',
                'priority': t.priority.capitalize(),
                'status': t.status.capitalize(),
                'timeRemaining': time_remaining,
            })
            
        return Response({
            # Tenant Stats
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'expired_tenants': expired_tenants,
            'suspended_tenants': suspended_tenants,
            
            # Revenue Stats
            'mrr': round(mrr, 2),
            'yearly_projection': round(yearly_projection, 2),
            
            # Growth Stats
            'new_signups_this_month': new_signups_this_month,
            'new_signups_last_month': new_signups_last_month,
            'churn_rate': round(churn_rate, 2),
            
            # Usage Stats
            'total_users': total_users,
            'avg_users_per_tenant': avg_users_per_tenant,
            'total_storage_mb': float(total_storage_mb),
            'total_api_calls': total_api_calls,
            
            # Support Stats
            'active_incidents': active_incidents,
            'recent_tickets': recent_tickets,
            
            # Breakdown
            'tier_breakdown': tier_breakdown,
            'recent_signups': recent_signup_list,
        })


