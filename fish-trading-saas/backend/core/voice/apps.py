"""
Voice App Configuration
"""

from django.apps import AppConfig


class VoiceConfig(AppConfig):
    label = 'voice'
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.voice'
    verbose_name = 'Voice Assistant'
    
    def ready(self):
        """Initialize signals and tasks"""
        import core.voice.signals  # noqa
