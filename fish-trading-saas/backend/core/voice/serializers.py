from rest_framework import serializers
from rest_framework_simplejwt.authentication import JWTAuthentication
from core.voice.models import (
    VoiceSession, VoiceCommand, VoiceTranscript, 
    FishNameAlias, VoiceCommandQueue, VoiceSettings, VoiceAnalytics
)


class VoiceTranscriptSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceTranscript
        fields = [
            'id', 'provider', 'provider_confidence', 'alternatives',
            'processing_time_ms', 'cost', 'language_detected', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'processing_time_ms', 'cost']


class VoiceCommandSerializer(serializers.ModelSerializer):
    transcript = VoiceTranscriptSerializer(read_only=True)
    
    class Meta:
        model = VoiceCommand
        fields = [
            'id', 'session', 'transcript_raw', 'transcript_cleaned',
            'extracted_entities', 'entity_confidence_scores', 'overall_confidence',
            'form_type', 'status', 'speech_provider', 'nlp_provider',
            'speech_provider_cost', 'nlp_provider_cost', 'error_message',
            'user_correction', 'transcript', 'created_at', 'updated_at',
            'audio_duration_seconds'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'transcript']


class VoiceCommandCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating voice commands with audio data"""
    audio_file = serializers.FileField(required=False, allow_empty_file=True)
    
    class Meta:
        model = VoiceCommand
        fields = [
            'audio_file', 'audio_duration_seconds', 'form_type'
        ]
        
    def create(self, validated_data):
        audio_file = validated_data.pop('audio_file', None)
        command = VoiceCommand.objects.create(**validated_data)
        
        if audio_file:
            # Handle file storage (implement in service layer)
            pass
        
        return command


class VoiceSessionSerializer(serializers.ModelSerializer):
    commands = VoiceCommandSerializer(many=True, read_only=True)
    
    class Meta:
        model = VoiceSession
        fields = [
            'id', 'user', 'company', 'language', 'language_detected',
            'status', 'start_time', 'end_time', 'total_commands',
            'successful_commands', 'failed_commands', 'conversation_context',
            'commands', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'company', 'created_at', 'updated_at']


class VoiceSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for starting a voice session"""
    class Meta:
        model = VoiceSession
        fields = ['language']


class VoiceSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing sessions"""
    class Meta:
        model = VoiceSession
        fields = [
            'id', 'language', 'status', 'start_time', 'end_time',
            'total_commands', 'successful_commands', 'created_at'
        ]


class FishNameAliasSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishNameAlias
        fields = [
            'id', 'normalized_name', 'english_name', 'tamil_name',
            'aliases', 'fish', 'usage_count', 'last_used', 'is_active'
        ]
        read_only_fields = ['id', 'usage_count', 'last_used']


class VoiceCommandQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceCommandQueue
        fields = [
            'id', 'status', 'audio_hash', 'metadata', 'retry_count',
            'error_message', 'synced_command', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VoiceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceSettings
        fields = [
            'id', 'primary_language', 'secondary_language', 'voice_gender',
            'voice_speed', 'mic_sensitivity', 'noise_cancellation_enabled',
            'auto_save_enabled', 'auto_save_confidence_threshold',
            'require_confirmation', 'confidence_threshold',
            'max_recording_duration', 'auto_stop_silence_duration',
            'store_audio', 'auto_delete_audio_days',
            'large_ui', 'high_contrast', 'is_active'
        ]
        read_only_fields = ['id']


class VoiceAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceAnalytics
        fields = [
            'id', 'user', 'company', 'date', 'total_commands',
            'successful_commands', 'failed_commands', 'average_confidence',
            'average_response_time_ms', 'total_audio_duration_seconds',
            'total_cost', 'form_type_breakdown', 'language_breakdown',
            'most_common_error', 'created_at'
        ]
        read_only_fields = [
            'id', 'user', 'company', 'created_at'
        ]


# Process Voice Request/Response

class ProcessVoiceRequestSerializer(serializers.Serializer):
    """Process raw audio and extract entities"""
    audio_file = serializers.FileField()
    command_id = serializers.UUIDField(required=False)
    language = serializers.ChoiceField(
        choices=['tamil', 'english', 'hindi', 'tanglish', 'mixed'],
        required=False
    )
    
    class Meta:
        fields = ['audio_file', 'command_id', 'language']


class ProcessVoiceResponseSerializer(serializers.Serializer):
    """Response from core.voice processing"""
    command_id = serializers.UUIDField()
    transcript = serializers.CharField()
    extracted_entities = serializers.JSONField()
    confidence_scores = serializers.JSONField()
    overall_confidence = serializers.FloatField()
    status = serializers.CharField()
    requires_confirmation = serializers.BooleanField()
    clarifications_needed = serializers.ListField(child=serializers.CharField(), required=False)


class ConfirmVoiceCommandSerializer(serializers.Serializer):
    """Confirm voice command and save to database"""
    command_id = serializers.UUIDField()
    confirmed = serializers.BooleanField()
    corrections = serializers.JSONField(required=False)
    
    class Meta:
        fields = ['command_id', 'confirmed', 'corrections']


class VoiceClarificationSerializer(serializers.Serializer):
    """Request clarification on specific fields"""
    command_id = serializers.UUIDField()
    clarification_text = serializers.CharField()
    
    class Meta:
        fields = ['command_id', 'clarification_text']


class VoiceStatisticsSerializer(serializers.Serializer):
    """Voice usage statistics"""
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    
    class Meta:
        fields = ['date_from', 'date_to']
