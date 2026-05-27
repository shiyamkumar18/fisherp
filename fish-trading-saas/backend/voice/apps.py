"""
Voice App Configuration
"""

from django.apps import AppConfig


class VoiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'voice'
    verbose_name = 'Voice Assistant'
    
    def ready(self):
        """Initialize signals and tasks"""
        import voice.signals  # noqa
