"""
Platform Manager Views Shim
==========================
Compatibility shim redirecting imports to the split views subpackage.
"""

from .views.dashboard import PlatformDashboardView
from .views.tenants import TenantListView, TenantDetailView, TenantSuspendView
from .views.subscriptions import (
    SubscriptionManagementView,
    ExtendSubscriptionView,
    FeatureFlagListView,
    FeatureFlagUpdateView,
)
from .views.impersonation import (
    StartImpersonationView,
    EndImpersonationView,
    ImpersonationStatusView,
    ActiveImpersonationsView,
)
from .views.support import (
    TenantSearchView,
    ResetPasswordView,
    ForceLogoutView,
    SendNotificationView,
)
from .views.monitoring import (
    AuditLogListView,
    ImpersonationLogListView,
    PlatformActivityView,
    SystemHealthView,
)
from .views.billing import (
    SubscriptionTierManagementView,
    SubscriptionTierDetailView,
    TenantActivityHeatmapView,
    BillingHistoryView,
    ErrorTrackingView,
    BackupStatusView,
)
