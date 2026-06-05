from django.apps import AppConfig


class PlatformConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saas_platform.platform_mgr'
    label = 'platform_mgr'
    verbose_name = 'Platform Management'
    
    def ready(self):
        """Import signals when app is ready"""
        pass
