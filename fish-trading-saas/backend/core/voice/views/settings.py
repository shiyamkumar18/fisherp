from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta

from core.voice.models import VoiceSettings, VoiceAnalytics, FishNameAlias
from core.voice.serializers import (
    VoiceSettingsSerializer, VoiceAnalyticsSerializer, FishNameAliasSerializer
)

class VoiceSettingsViewSet(viewsets.ViewSet):
    """Voice user settings"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def retrieve_settings(self, request):
        """Get user's voice settings"""
        settings, _ = VoiceSettings.objects.get_or_create(
            user=request.user,
            company=request.user.company,
        )
        return Response(VoiceSettingsSerializer(settings).data)
    
    @action(detail=False, methods=['post'])
    def update_settings(self, request):
        """Update voice settings"""
        settings, _ = VoiceSettings.objects.get_or_create(
            user=request.user,
            company=request.user.company,
        )
        
        serializer = VoiceSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)


class VoiceAnalyticsViewSet(viewsets.ViewSet):
    """Voice analytics and statistics"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get user's voice statistics"""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        # Default: last 30 days
        if not date_to:
            date_to = datetime.now().date()
        else:
            date_to = datetime.fromisoformat(date_to).date()
        
        if not date_from:
            date_from = date_to - timedelta(days=30)
        else:
            date_from = datetime.fromisoformat(date_from).date()
        
        analytics = VoiceAnalytics.objects.filter(
            user=request.user,
            company=request.user.company,
            date__range=[date_from, date_to]
        ).order_by('date')
        
        serializer = VoiceAnalyticsSerializer(analytics, many=True)
        return Response(serializer.data)


class FishNameAliasViewSet(viewsets.ViewSet):
    """Fish name alias management"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def list_aliases(self, request):
        """List all fish aliases for company"""
        aliases = FishNameAlias.objects.filter(
            company=request.user.company,
            is_active=True
        ).order_by('usage_count')
        
        serializer = FishNameAliasSerializer(aliases, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_alias(self, request):
        """Add new fish alias"""
        normalized_name = request.data.get('normalized_name')
        aliases = request.data.get('aliases', [])
        english_name = request.data.get('english_name', '')
        tamil_name = request.data.get('tamil_name', '')
        
        if not normalized_name:
            return Response(
                {'error': 'normalized_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        obj, created = FishNameAlias.objects.get_or_create(
            company=request.user.company,
            normalized_name=normalized_name,
            defaults={
                'english_name': english_name,
                'tamil_name': tamil_name,
                'aliases': aliases,
            }
        )
        
        if not created:
            obj.aliases = list(set(obj.aliases + aliases))
            obj.save()
        
        return Response(
            FishNameAliasSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
