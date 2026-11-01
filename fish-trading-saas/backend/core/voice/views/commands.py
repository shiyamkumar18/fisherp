from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import PermissionDenied

from core.voice.models import VoiceCommand
from core.voice.serializers import (
    VoiceCommandSerializer, ConfirmVoiceCommandSerializer, VoiceClarificationSerializer
)
from core.voice.services.voice_service import VoiceService
from core.voice.services.nlp_engine import EntityExtractor

class VoiceCommandViewSet(viewsets.ModelViewSet):
    """
    Voice command processing and management.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = VoiceCommandSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
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
        
        if not session_id:
            return Response(
                {'error': 'session_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            audio_data = audio_file.read()
            result = VoiceService.process_voice_command(
                user=request.user,
                session_id=session_id,
                audio_data=audio_data,
                language=language,
                form_type=form_type
            )
            return Response(result, status=status.HTTP_200_OK)
        except DjangoValidationError as e:
            return Response(
                {'error': str(e.message if hasattr(e, 'message') else e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def confirm(self, request):
        """
        Confirm voice command and save to database.
        """
        serializer = ConfirmVoiceCommandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        command_id = serializer.validated_data['command_id']
        confirmed = serializer.validated_data['confirmed']
        corrections = serializer.validated_data.get('corrections', {})
        
        try:
            result = VoiceService.confirm_voice_command(
                user=request.user,
                command_id=command_id,
                confirmed=confirmed,
                corrections=corrections
            )
            return Response(result, status=status.HTTP_200_OK)
        except DjangoValidationError as e:
            return Response(
                {'error': str(e.message_dict if hasattr(e, 'message_dict') else e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def clarify(self, request):
        """
        Handle user clarification on command.
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
