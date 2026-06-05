"""
Voice Assistant API Views Shim
Forwards requests to the modular views sub-package.
"""

from core.voice.views.sessions import VoiceSessionViewSet
from core.voice.views.commands import VoiceCommandViewSet
from core.voice.views.settings import VoiceSettingsViewSet, VoiceAnalyticsViewSet, FishNameAliasViewSet
