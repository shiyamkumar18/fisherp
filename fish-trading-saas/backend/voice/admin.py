"""
Voice Admin Interface
"""

from django.contrib import admin
from voice.models import (
    VoiceSession, VoiceCommand, VoiceTranscript,
    FishNameAlias, VoiceCommandQueue, VoiceSettings, VoiceAnalytics
)


@admin.register(VoiceSession)
class VoiceSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'company', 'language', 'status', 'total_commands', 'created_at']
    list_filter = ['status', 'language', 'created_at', 'company']
    search_fields = ['user__username', 'user__email', 'company__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('id', 'user', 'company', 'status', 'language', 'language_detected')
        }),
        ('Timing', {
            'fields': ('start_time', 'end_time', 'created_at', 'updated_at')
        }),
        ('Statistics', {
            'fields': ('total_commands', 'successful_commands', 'failed_commands')
        }),
        ('Context', {
            'fields': ('conversation_context', 'ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VoiceCommand)
class VoiceCommandAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'status', 'form_type', 'overall_confidence', 'created_at']
    list_filter = ['status', 'form_type', 'speech_provider', 'created_at']
    search_fields = ['transcript_raw', 'session__user__username']
    readonly_fields = ['id', 'created_at', 'updated_at', 'audio_hash']
    
    fieldsets = (
        ('Command Info', {
            'fields': ('id', 'session', 'status', 'form_type')
        }),
        ('Audio Data', {
            'fields': ('audio_file_path', 'audio_duration_seconds', 'audio_size_bytes', 'audio_hash'),
            'classes': ('collapse',)
        }),
        ('Transcription', {
            'fields': ('transcript_raw', 'transcript_cleaned')
        }),
        ('Extraction', {
            'fields': ('extracted_entities', 'entity_confidence_scores', 'overall_confidence')
        }),
        ('Processing', {
            'fields': (
                'speech_provider', 'speech_provider_response_time_ms', 'speech_provider_cost',
                'nlp_provider', 'nlp_response_time_ms', 'nlp_provider_cost'
            ),
            'classes': ('collapse',)
        }),
        ('Error Handling', {
            'fields': ('error_message', 'error_type', 'user_correction'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VoiceTranscript)
class VoiceTranscriptAdmin(admin.ModelAdmin):
    list_display = ['id', 'command', 'provider', 'provider_confidence', 'cost', 'created_at']
    list_filter = ['provider', 'created_at']
    readonly_fields = ['id', 'created_at']
    
    fieldsets = (
        ('Transcript Info', {
            'fields': ('id', 'command', 'provider', 'provider_confidence')
        }),
        ('Processing', {
            'fields': ('processing_time_ms', 'cost', 'language_detected')
        }),
        ('Alternatives', {
            'fields': ('alternatives',),
            'classes': ('collapse',)
        }),
        ('Provider Response', {
            'fields': ('provider_response',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(FishNameAlias)
class FishNameAliasAdmin(admin.ModelAdmin):
    list_display = ['normalized_name', 'company', 'english_name', 'usage_count', 'last_used', 'is_active']
    list_filter = ['company', 'is_active', 'usage_count', 'last_used']
    search_fields = ['normalized_name', 'english_name', 'tamil_name', 'aliases']
    readonly_fields = ['usage_count', 'last_used']
    
    fieldsets = (
        ('Fish Name', {
            'fields': ('normalized_name', 'english_name', 'tamil_name', 'company', 'fish')
        }),
        ('Aliases', {
            'fields': ('aliases',)
        }),
        ('Tracking', {
            'fields': ('usage_count', 'last_used', 'is_active'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VoiceCommandQueue)
class VoiceCommandQueueAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'retry_count', 'created_at']
    list_filter = ['status', 'created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Queue Info', {
            'fields': ('id', 'user', 'company', 'status')
        }),
        ('Audio Data', {
            'fields': ('audio_hash', 'metadata', 'audio_data'),
            'classes': ('collapse',)
        }),
        ('Retry', {
            'fields': ('retry_count', 'last_retry', 'next_retry')
        }),
        ('Sync', {
            'fields': ('synced_command', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VoiceSettings)
class VoiceSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'primary_language', 'voice_gender', 'is_active']
    list_filter = ['primary_language', 'is_active', 'company']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User Info', {
            'fields': ('id', 'user', 'company')
        }),
        ('Language', {
            'fields': ('primary_language', 'secondary_language')
        }),
        ('Voice', {
            'fields': ('voice_gender', 'voice_speed')
        }),
        ('Microphone', {
            'fields': ('mic_sensitivity', 'noise_cancellation_enabled')
        }),
        ('Auto-save', {
            'fields': ('auto_save_enabled', 'auto_save_confidence_threshold')
        }),
        ('Confirmation', {
            'fields': ('require_confirmation', 'confidence_threshold')
        }),
        ('Recording', {
            'fields': ('max_recording_duration', 'auto_stop_silence_duration')
        }),
        ('Privacy', {
            'fields': ('store_audio', 'auto_delete_audio_days')
        }),
        ('Accessibility', {
            'fields': ('large_ui', 'high_contrast', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VoiceAnalytics)
class VoiceAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['user', 'company', 'date', 'total_commands', 'successful_commands', 'average_confidence']
    list_filter = ['company', 'date']
    readonly_fields = ['id', 'created_at']
    
    fieldsets = (
        ('Analytics Info', {
            'fields': ('id', 'user', 'company', 'date')
        }),
        ('Commands', {
            'fields': ('total_commands', 'successful_commands', 'failed_commands')
        }),
        ('Performance', {
            'fields': ('average_confidence', 'average_response_time_ms', 'total_audio_duration_seconds')
        }),
        ('Cost', {
            'fields': ('total_cost',)
        }),
        ('Breakdown', {
            'fields': ('form_type_breakdown', 'language_breakdown', 'most_common_error'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
