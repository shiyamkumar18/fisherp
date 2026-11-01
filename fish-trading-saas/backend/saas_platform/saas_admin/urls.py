"""
Platform Manager URL Configuration
===================================

Routes for platform-level management endpoints.
All routes require platform_operator role.
"""

from django.urls import path
from .views import (
    # Dashboard
    PlatformDashboardView,
    
    # Tenant Management
    TenantListView,
    TenantDetailView,
    TenantSuspendView,
    
    # Subscription Management
    SubscriptionManagementView,
    ExtendSubscriptionView,
    
    # Feature Flags
    FeatureFlagListView,
    FeatureFlagUpdateView,
    
    # Impersonation
    StartImpersonationView,
    EndImpersonationView,
    ImpersonationStatusView,
    ActiveImpersonationsView,
    
    # Support Tools
    TenantSearchView,
    ResetPasswordView,
    ForceLogoutView,
    SendNotificationView,
    
    # Audit & Monitoring
    AuditLogListView,
    ImpersonationLogListView,
    PlatformActivityView,
    SystemHealthView,
    
    # Tier Management
    SubscriptionTierManagementView,
    SubscriptionTierDetailView,
    
    # Extra Tools
    TenantActivityHeatmapView,
    BillingHistoryView,
    ErrorTrackingView,
    BackupStatusView,
)

urlpatterns = [
    # ===== DASHBOARD =====
    path('dashboard/', PlatformDashboardView.as_view(), name='platform-dashboard'),
    
    # ===== TENANT MANAGEMENT =====
    path('tenants/', TenantListView.as_view(), name='tenant-list'),
    path('tenants/<int:tenant_id>/', TenantDetailView.as_view(), name='tenant-detail'),
    path('tenants/<int:tenant_id>/suspend/', TenantSuspendView.as_view(), name='tenant-suspend'),
    
    # ===== SUBSCRIPTION MANAGEMENT =====
    path('subscriptions/', SubscriptionManagementView.as_view(), name='subscription-management'),
    path('subscriptions/<int:tenant_id>/extend/', ExtendSubscriptionView.as_view(), name='subscription-extend'),
    
    # ===== FEATURE FLAGS =====
    path('features/', FeatureFlagListView.as_view(), name='feature-flags'),
    path('features/<int:tenant_id>/', FeatureFlagUpdateView.as_view(), name='feature-flag-update'),
    
    # ===== IMPERSONATION =====
    path('impersonate/<int:tenant_id>/start/', StartImpersonationView.as_view(), name='impersonate-start'),
    path('impersonate/end/', EndImpersonationView.as_view(), name='impersonate-end'),
    path('impersonate/status/', ImpersonationStatusView.as_view(), name='impersonate-status'),
    path('impersonate/active/', ActiveImpersonationsView.as_view(), name='impersonate-active'),
    
    # ===== SUPPORT TOOLS =====
    path('search/', TenantSearchView.as_view(), name='tenant-search'),
    path('tenants/<int:tenant_id>/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('tenants/<int:tenant_id>/force-logout/', ForceLogoutView.as_view(), name='force-logout'),
    path('tenants/<int:tenant_id>/notify/', SendNotificationView.as_view(), name='send-notification'),
    
    # ===== AUDIT & MONITORING =====
    path('audit/', AuditLogListView.as_view(), name='audit-logs'),
    path('audit/impersonation/', ImpersonationLogListView.as_view(), name='impersonation-logs'),
    path('activity/', PlatformActivityView.as_view(), name='platform-activity'),
    path('health/', SystemHealthView.as_view(), name='system-health'),
    
    # ===== TIER MANAGEMENT =====
    path('tiers/', SubscriptionTierManagementView.as_view(), name='tier-management'),
    path('tiers/<int:tier_id>/', SubscriptionTierDetailView.as_view(), name='tier-detail'),
    
    # ===== EXTRA TOOLS =====
    path('activity-heatmap/', TenantActivityHeatmapView.as_view(), name='activity-heatmap'),
    path('billing-history/', BillingHistoryView.as_view(), name='billing-history'),
    path('error-tracking/', ErrorTrackingView.as_view(), name='error-tracking'),
    path('backup-status/', BackupStatusView.as_view(), name='backup-status'),
]
