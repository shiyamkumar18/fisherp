"""
SaaS Admin App Configuration
============================

Django app configuration for the Platform Manager module.
"""

from django.apps import AppConfig


class SaasAdminConfig(AppConfig):
    """Configuration for the SaaS Admin/Platform Manager module."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saas_admin'
    verbose_name = 'Platform Manager'
    
    def ready(self):
        """Run when the app is ready."""
        # Import signals if any
        pass

