"""
Voice Assistant URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.voice.views import (
    VoiceSessionViewSet,
    VoiceCommandViewSet,
    VoiceSettingsViewSet,
    VoiceAnalyticsViewSet,
    FishNameAliasViewSet,
)

router = DefaultRouter()
router.register(r'sessions', VoiceSessionViewSet, basename='voice-session')
router.register(r'commands', VoiceCommandViewSet, basename='voice-command')
router.register(r'settings', VoiceSettingsViewSet, basename='voice-settings')
router.register(r'analytics', VoiceAnalyticsViewSet, basename='voice-analytics')
router.register(r'aliases', FishNameAliasViewSet, basename='fish-alias')

urlpatterns = [
    path('', include(router.urls)),
]
