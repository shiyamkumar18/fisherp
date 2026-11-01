from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from core.voice.models import VoiceSession, VoiceSettings
from core.voice.serializers import (
    VoiceSessionSerializer, VoiceSessionCreateSerializer, VoiceSessionListSerializer,
    VoiceSettingsSerializer
)

class VoiceSessionViewSet(viewsets.ModelViewSet):
    """
    Voice session management.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = VoiceSessionSerializer
    
    def get_queryset(self):
        """Only return user's own sessions"""
        return VoiceSession.objects.filter(
            user=self.request.user,
            company=self.request.user.company
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VoiceSessionCreateSerializer
        elif self.action == 'list':
            return VoiceSessionListSerializer
        return VoiceSessionSerializer
    
    def create(self, request, *args, **kwargs):
        """Start a new voice session"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        language = serializer.validated_data.get('language', 'tamil')
        
        # Create session
        session = VoiceSession.objects.create(
            user=request.user,
            company=request.user.company,
            language=language,
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
        )
        
        # Initialize or get voice settings
        voice_settings, _ = VoiceSettings.objects.get_or_create(
            user=request.user,
            company=request.user.company,
        )
        
        # Store settings in session context
        session.conversation_context = {
            'voice_settings': VoiceSettingsSerializer(voice_settings).data
        }
        session.save()
        
        return Response(
            VoiceSessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        """End a voice session"""
        session = self.get_object()
        
        if session.status == 'completed':
            return Response(
                {'error': 'Session already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.status = 'completed'
        session.end_time = timezone.now()
        session.save()
        
        return Response(VoiceSessionSerializer(session).data)
    
    @action(detail=False, methods=['get'])
    def active_session(self, request):
        """Get or create active session"""
        try:
            session = VoiceSession.objects.filter(
                user=request.user,
                company=request.user.company,
                status='active'
            ).latest('created_at')
            
            return Response(VoiceSessionSerializer(session).data)
        except VoiceSession.DoesNotExist:
            # Create new active session
            session = VoiceSession.objects.create(
                user=request.user,
                company=request.user.company,
                language='tamil',
            )
            return Response(
                VoiceSessionSerializer(session).data,
                status=status.HTTP_201_CREATED
            )
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
