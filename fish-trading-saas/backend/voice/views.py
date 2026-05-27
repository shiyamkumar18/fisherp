"""
Voice Assistant API Views
REST endpoints for voice processing and form filling.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db.models import Q
import uuid

from voice.models import (
    VoiceSession, VoiceCommand, VoiceTranscript, 
    FishNameAlias, VoiceSettings, VoiceAnalytics
)
from voice.serializers import (
    VoiceSessionSerializer, VoiceSessionCreateSerializer, VoiceSessionListSerializer,
    VoiceCommandSerializer, VoiceCommandCreateSerializer,
    FishNameAliasSerializer, VoiceSettingsSerializer, VoiceAnalyticsSerializer,
    ProcessVoiceRequestSerializer, ProcessVoiceResponseSerializer,
    ConfirmVoiceCommandSerializer, VoiceClarificationSerializer
)
from voice.services.speech_provider import SpeechProviderFactory
from voice.services.nlp_engine import EntityExtractor, ConfidenceScorer, ClarificationEngine
from voice.services.fish_normalizer import FishNormalizer


class VoiceSessionViewSet(viewsets.ModelViewSet):
    """
    Voice session management.
    
    Endpoints:
    - POST /voice/sessions/ → Start new session
    - GET /voice/sessions/ → List user's sessions
    - GET /voice/sessions/{id}/ → Get session details
    - PATCH /voice/sessions/{id}/ → Update session
    - DELETE /voice/sessions/{id}/ → End session
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


class VoiceCommandViewSet(viewsets.ModelViewSet):
    """
    Voice command processing and management.
    
    Endpoints:
    - POST /voice/commands/process/ → Process audio + extract entities
    - POST /voice/commands/confirm/ → Confirm and save
    - POST /voice/commands/clarify/ → Request clarification
    - GET /voice/commands/history/ → Command history
    """
    permission_classes = [IsAuthenticated]
    serializer_class = VoiceCommandSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        """Only return user's commands"""
        return VoiceCommand.objects.filter(
            session__user=self.request.user,
            session__company=self.request.user.company
        )
    
    @action(detail=False, methods=['post'])
    def process(self, request):
        """
        Process audio file and extract entities.
        
        POST /voice/commands/process/
        {
            'audio_file': <file>,
            'session_id': 'uuid',
            'language': 'tamil'
        }
        """
        if 'audio_file' not in request.FILES:
            return Response(
                {'error': 'audio_file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        audio_file = request.FILES['audio_file']
        session_id = request.data.get('session_id')
        language = request.data.get('language', 'tamil')
        form_type = request.data.get('form_type', 'other')
        
        # Validate session
        if not session_id:
            return Response(
                {'error': 'session_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = VoiceSession.objects.get(
                id=session_id,
                user=request.user
            )
        except VoiceSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create command record
        command = VoiceCommand.objects.create(
            session=session,
            form_type=form_type,
            status='recording'
        )
        
        try:
            # Read audio
            audio_data = audio_file.read()
            command.audio_size_bytes = len(audio_data)
            command.save()
            
            # Step 1: Transcribe
            command.status = 'transcribed'
            command.save()
            
            provider = SpeechProviderFactory.get_provider()
            transcription = provider.transcribe(audio_data, language)
            
            command.transcript_raw = transcription['transcript']
            command.speech_provider = transcription.get('provider', 'unknown')
            command.speech_provider_response_time_ms = transcription.get('response_time_ms', 0)
            command.speech_provider_cost = transcription.get('cost', 0)
            command.save()
            
            # Create transcript record
            VoiceTranscript.objects.create(
                command=command,
                provider=command.speech_provider,
                provider_confidence=transcription.get('confidence', 0),
                alternatives=transcription.get('alternatives', []),
                processing_time_ms=transcription.get('response_time_ms', 0),
                cost=transcription.get('cost', 0),
                language_detected=transcription.get('language', language),
            )
            
            # Step 2: Extract entities
            command.status = 'extracted'
            
            extractor = EntityExtractor(request.user.company_id)
            extraction = extractor.extract_entities(
                command.transcript_raw,
                language
            )
            
            command.extracted_entities = extraction['entities']
            command.entity_confidence_scores = extraction['confidence_scores']
            command.overall_confidence = extraction['overall_confidence']
            
            # Normalize fish name
            if command.extracted_entities.get('fish_name'):
                fish_normalizer = FishNormalizer(request.user.company_id)
                normalized, conf, fish_id = fish_normalizer.normalize(
                    command.extracted_entities['fish_name']
                )
                if normalized:
                    command.extracted_entities['fish_name'] = normalized
                    command.extracted_entities['fish_id'] = fish_id
                    command.entity_confidence_scores['fish_name'] = conf
                    fish_normalizer.track_usage(normalized)
            
            command.nlp_provider = 'rule_based'
            command.save()
            
            # Determine if clarification needed
            missing_fields = ClarificationEngine.get_missing_required_fields(
                command.extracted_entities,
                form_type
            )
            
            low_confidence_fields = ClarificationEngine.get_low_confidence_fields(
                command.extracted_entities,
                command.entity_confidence_scores,
                threshold=0.7
            )
            
            requires_confirmation = (
                command.overall_confidence < 0.8 or
                bool(missing_fields) or
                bool(low_confidence_fields)
            )
            
            if requires_confirmation:
                command.status = 'confirming'
            else:
                command.status = 'confirmed'
            
            command.save()
            
            # Return response
            return Response({
                'command_id': command.id,
                'transcript': command.transcript_raw,
                'transcript_cleaned': command.transcript_cleaned,
                'extracted_entities': command.extracted_entities,
                'confidence_scores': command.entity_confidence_scores,
                'overall_confidence': command.overall_confidence,
                'form_type': form_type,
                'status': command.status,
                'requires_confirmation': requires_confirmation,
                'missing_fields': missing_fields,
                'low_confidence_fields': low_confidence_fields,
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            command.status = 'failed'
            command.error_message = str(e)
            command.error_type = type(e).__name__
            command.save()
            
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def confirm(self, request):
        """
        Confirm voice command and save to database.
        
        POST /voice/commands/confirm/
        {
            'command_id': 'uuid',
            'confirmed': true,
            'corrections': {...}
        }
        """
        serializer = ConfirmVoiceCommandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        command_id = serializer.validated_data['command_id']
        confirmed = serializer.validated_data['confirmed']
        corrections = serializer.validated_data.get('corrections', {})
        
        try:
            command = VoiceCommand.objects.get(
                id=command_id,
                session__user=request.user
            )
        except VoiceCommand.DoesNotExist:
            return Response(
                {'error': 'Command not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not confirmed:
            command.status = 'cancelled'
            command.save()
            return Response({'status': 'cancelled'})
        
        # Apply corrections
        if corrections:
            command.extracted_entities.update(corrections)
            command.user_correction = str(corrections)
        
        command.status = 'confirmed'
        command.save()
        
        # TODO: Save to appropriate form (purchase, sale, etc.)
        # This will be integrated with existing forms in next phase
        
        return Response({
            'command_id': command.id,
            'status': 'confirmed',
            'entities': command.extracted_entities,
        })
    
    @action(detail=False, methods=['post'])
    def clarify(self, request):
        """
        Handle user clarification on command.
        
        POST /voice/commands/clarify/
        {
            'command_id': 'uuid',
            'clarification_text': 'rate 420, not 420',
        }
        """
        serializer = VoiceClarificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        command_id = serializer.validated_data['command_id']
        clarification = serializer.validated_data['clarification_text']
        
        try:
            command = VoiceCommand.objects.get(
                id=command_id,
                session__user=request.user
            )
        except VoiceCommand.DoesNotExist:
            return Response(
                {'error': 'Command not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extract entities from clarification
        extractor = EntityExtractor(request.user.company_id)
        extraction = extractor.extract_entities(clarification)
        
        # Update command with corrections
        command.extracted_entities.update(extraction['entities'])
        command.entity_confidence_scores.update(extraction['confidence_scores'])
        command.user_correction = clarification
        command.status = 'confirmed'
        command.save()
        
        return Response({
            'command_id': command.id,
            'status': 'confirmed',
            'entities': command.extracted_entities,
        })
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get command history for user"""
        session_id = request.query_params.get('session_id')
        
        queryset = self.get_queryset()
        
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        queryset = queryset.order_by('-created_at')[:50]  # Last 50 commands
        
        serializer = VoiceCommandSerializer(queryset, many=True)
        return Response(serializer.data)


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
        from datetime import datetime, timedelta
        
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
