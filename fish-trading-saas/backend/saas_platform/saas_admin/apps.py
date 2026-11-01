"""
SaaS Admin App Configuration
============================

Django app configuration for the Platform Manager module.
"""

from django.apps import AppConfig


class SaasAdminConfig(AppConfig):
    label = 'saas_admin'
    """Configuration for the SaaS Admin/Platform Manager module."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saas_platform.saas_admin'
    verbose_name = 'Platform Manager'
    
    def ready(self):
        """Run when the app is ready."""
        # Import signals if any
        pass
