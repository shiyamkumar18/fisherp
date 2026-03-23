from django.apps import AppConfig


class PlatformConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'platform'
    verbose_name = 'Platform Management'
    
    def ready(self):
        """Import signals when app is ready"""
        pass

