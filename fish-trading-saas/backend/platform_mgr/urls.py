from django.urls import path
from . import views

urlpatterns = [
    # Platform Management
    path('statistics/', views.PlatformStatisticsView.as_view(), name='platform_statistics'),
    path('tenants/', views.TenantManagementView.as_view(), name='tenant_management'),
    path('subscriptions/', views.SubscriptionManagementView.as_view(), name='subscription_management'),
    
    # Platform Tools
    path('activity-heatmap/', views.TenantActivityHeatmapView.as_view(), name='activity_heatmap'),
    path('billing-history/', views.BillingHistoryView.as_view(), name='billing_history'),
    path('error-tracking/', views.ErrorTrackingView.as_view(), name='error_tracking'),
    path('backup-status/', views.BackupStatusView.as_view(), name='backup_status'),
    
    # Impersonation
    path('impersonation/', views.ImpersonationManagementView.as_view(), name='impersonation_management'),
    
    # Audit Logs
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit_log_list'),
]

