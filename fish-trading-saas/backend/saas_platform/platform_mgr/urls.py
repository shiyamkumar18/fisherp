from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_enterprise
from saas_platform.subscriptions.views import PlatformSubscriptionViewSet
from . import views_security
from . import views_diagnostics
from . import views_growth
from . import views_staff
from . import views_notifications

router = DefaultRouter()
router.register(r'advanced-subscriptions', PlatformSubscriptionViewSet, basename='platform-subscriptions')

urlpatterns = [
    path('', include(router.urls)),
    # Platform Management
    path('statistics/', views.PlatformStatisticsView.as_view(), name='platform_statistics'),
    path('tenants/', views.TenantManagementView.as_view(), name='tenant_management'),
    path('subscriptions/', views.SubscriptionManagementView.as_view(), name='subscription_management'),
    
    # Platform Tools
    path('activity-heatmap/', views.TenantActivityHeatmapView.as_view(), name='activity_heatmap'),
    path('billing-history/', views.BillingHistoryView.as_view(), name='billing_history'),
    path('error-tracking/', views.ErrorTrackingView.as_view(), name='error_tracking'),
    # Diagnostics & Operations Center
    path('diagnostics/health/', views_diagnostics.PlatformDiagnosticsHealthView.as_view(), name='diagnostics_health'),
    path('diagnostics/services/', views_diagnostics.LiveServiceMonitoringView.as_view(), name='diagnostics_services'),
    path('diagnostics/incidents/', views_diagnostics.InfrastructureIncidentsView.as_view(), name='diagnostics_incidents'),
    path('diagnostics/tenants/', views_diagnostics.TenantResourceMonitoringView.as_view(), name='diagnostics_tenants'),
    path('diagnostics/jobs/', views_diagnostics.BackgroundJobMonitorView.as_view(), name='diagnostics_jobs'),
    
    # Growth & SaaS Analytics
    path('growth/kpis/', views_growth.GrowthKPIView.as_view(), name='growth_kpis'),
    path('growth/funnel/', views_growth.GrowthFunnelView.as_view(), name='growth_funnel'),
    path('growth/kanban/', views_growth.TenantLifecycleKanbanView.as_view(), name='growth_kanban'),
    path('growth/tenants/', views_growth.ActionableTenantTableView.as_view(), name='growth_tenants'),
    path('growth/plans/', views_growth.PlanPerformanceView.as_view(), name='growth_plans'),
    path('growth/actions/', views_growth.GrowthActionCenterView.as_view(), name='growth_actions'),
    
    # Workforce Operations
    path('staff/kpis/', views_staff.StaffKPIView.as_view(), name='staff_kpis'),
    path('staff/directory/', views_staff.StaffDirectoryView.as_view(), name='staff_directory'),
    path('staff/hierarchy/', views_staff.StaffHierarchyView.as_view(), name='staff_hierarchy'),
    path('staff/invites/', views_staff.StaffInviteView.as_view(), name='staff_invites'),
    path('staff/actions/', views_staff.StaffActionView.as_view(), name='staff_actions'),
    
    # Communication Center
    path('notifications/kpis/', views_notifications.NotificationKPIView.as_view(), name='notification_kpis'),
    path('notifications/broadcasts/', views_notifications.NotificationBroadcastView.as_view(), name='notification_broadcasts'),
    path('notifications/analytics/', views_notifications.NotificationAnalyticsView.as_view(), name='notification_analytics'),
    path('notifications/actions/', views_notifications.NotificationActionView.as_view(), name='notification_actions'),
    
    path('backup-status/', views.BackupStatusView.as_view(), name='backup_status'),
    
    # Impersonation
    path('impersonation/', views.ImpersonationManagementView.as_view(), name='impersonation_management'),
    
    # Audit Logs
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit_log_list'),
    
    # SOC / Security Operations Center
    path('security/kpi/', views_security.SecurityKPIView.as_view(), name='security_kpi'),
    path('security/incidents/', views_security.SecurityIncidentFeedView.as_view(), name='security_incidents'),
    path('security/login-intelligence/', views_security.LoginIntelligenceView.as_view(), name='login_intelligence'),
    path('security/impersonation-war-room/', views_security.ImpersonationWarRoomView.as_view(), name='impersonation_war_room'),
    path('security/impersonation-war-room/<int:pk>/', views_security.ImpersonationWarRoomView.as_view(), name='impersonation_war_room_action'),
    
    # Enterprise Operations Console
    path('enterprise/revenue/', views_enterprise.RevenueAnalyticsView.as_view(), name='enterprise_revenue'),
    path('enterprise/billing/failed/', views_enterprise.FailedBillingQueueView.as_view(), name='failed_billing_queue'),
    path('enterprise/revenue/tenants/', views_enterprise.TenantRevenueTableView.as_view(), name='tenant_revenue_table'),
    path('enterprise/churn/prediction/', views_enterprise.ChurnPredictionEngineView.as_view(), name='churn_prediction'),
    path('enterprise/search/', views_enterprise.GlobalSearchView.as_view(), name='enterprise_search'),
    path('enterprise/tenant/<int:tenant_id>/intelligence/', views_enterprise.TenantIntelligenceView.as_view(), name='tenant_intelligence'),
]
