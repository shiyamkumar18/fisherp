"""
saas_admin.views package
========================
This package splits the monolithic views.py into focused modules.
The original views.py is kept as a compatibility shim and re-exports everything.

Modules:
  dashboard    - PlatformDashboardView
  tenants      - TenantListView, TenantDetailView, TenantSuspendView
  subscriptions - SubscriptionManagementView, ExtendSubscriptionView, FeatureFlagListView, FeatureFlagUpdateView
  impersonation - StartImpersonationView, EndImpersonationView, ImpersonationStatusView, ActiveImpersonationsView
  support      - TenantSearchView, ResetPasswordView, ForceLogoutView, SendNotificationView
  monitoring   - AuditLogListView, ImpersonationLogListView, PlatformActivityView, SystemHealthView
  billing      - SubscriptionTierManagementView, SubscriptionTierDetailView, TenantActivityHeatmapView, BillingHistoryView, ErrorTrackingView, BackupStatusView
"""

from .dashboard import PlatformDashboardView
from .tenants import TenantListView, TenantDetailView, TenantSuspendView
from .subscriptions import (
    SubscriptionManagementView,
    ExtendSubscriptionView,
    FeatureFlagListView,
    FeatureFlagUpdateView,
)
from .impersonation import (
    StartImpersonationView,
    EndImpersonationView,
    ImpersonationStatusView,
    ActiveImpersonationsView,
)
from .support import (
    TenantSearchView,
    ResetPasswordView,
    ForceLogoutView,
    SendNotificationView,
)
from .monitoring import (
    AuditLogListView,
    ImpersonationLogListView,
    PlatformActivityView,
    SystemHealthView,
)
from .billing import (
    SubscriptionTierManagementView,
    SubscriptionTierDetailView,
    TenantActivityHeatmapView,
    BillingHistoryView,
    ErrorTrackingView,
    BackupStatusView,
)

__all__ = [
    "PlatformDashboardView",
    "TenantListView",
    "TenantDetailView",
    "TenantSuspendView",
    "SubscriptionManagementView",
    "ExtendSubscriptionView",
    "FeatureFlagListView",
    "FeatureFlagUpdateView",
    "StartImpersonationView",
    "EndImpersonationView",
    "ImpersonationStatusView",
    "ActiveImpersonationsView",
    "TenantSearchView",
    "ResetPasswordView",
    "ForceLogoutView",
    "SendNotificationView",
    "AuditLogListView",
    "ImpersonationLogListView",
    "PlatformActivityView",
    "SystemHealthView",
    "SubscriptionTierManagementView",
    "SubscriptionTierDetailView",
    "TenantActivityHeatmapView",
    "BillingHistoryView",
    "ErrorTrackingView",
    "BackupStatusView",
]
