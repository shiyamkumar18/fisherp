from django.apps import AppConfig


class DashboardConfig(AppConfig):
    label = 'dashboard'
    name = "business.dashboard"
    
    def ready(self):
        import business.dashboard.signals  # noqa: F401  # Future signal handlers
