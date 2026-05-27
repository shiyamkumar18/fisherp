import uuid
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from accounts.models import User
from companies.models import Company
from trading.models import Fish


class VoiceSession(models.Model):
    """
    Represents a single voice interaction session.
    A session can contain multiple voice commands.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('paused', 'Paused'),
    ]
    
    LANGUAGE_CHOICES = [
        ('tamil', 'Tamil'),
        ('english', 'English'),
        ('hindi', 'Hindi'),
        ('tanglish', 'Tanglish'),
        ('mixed', 'Mixed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='voice_sessions')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='voice_sessions')
    
    language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default='tamil')
    language_detected = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, blank=True,
                                        help_text="Auto-detected language if differs from preference")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    
    # Session metadata
    total_commands = models.PositiveIntegerField(default=0)
    successful_commands = models.PositiveIntegerField(default=0)
    failed_commands = models.PositiveIntegerField(default=0)
    
    # Context for multi-turn conversations
    conversation_context = models.JSONField(default=dict, blank=True,
                                           help_text="Stores conversation state, partial forms, etc.")
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'company']),
            models.Index(fields=['company', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"VoiceSession {self.id} - {self.user.username}"


class VoiceCommand(models.Model):
    """
    Individual voice command within a session.
    Contains raw audio, transcription, and extracted entities.
    """
    STATUS_CHOICES = [
        ('recording', 'Recording'),
        ('transcribed', 'Transcribed'),
        ('extracted', 'Entities Extracted'),
        ('confirmed', 'Confirmed'),
        ('saved', 'Saved to Database'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    FORM_TYPE_CHOICES = [
        ('purchase', 'Purchase Entry'),
        ('sale', 'Sale Entry'),
        ('payment', 'Payment Entry'),
        ('inventory', 'Inventory Update'),
        ('inquiry', 'General Inquiry'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(VoiceSession, on_delete=models.CASCADE, related_name='commands')
    
    # Audio data (references external storage)
    audio_file_path = models.CharField(max_length=500, blank=True,
                                      help_text="Path to encrypted audio in S3/MinIO")
    audio_duration_seconds = models.FloatField(null=True, blank=True)
    audio_size_bytes = models.PositiveIntegerField(null=True, blank=True)
    audio_hash = models.CharField(max_length=64, blank=True, db_index=True,
                                 help_text="SHA256 hash for deduplication")
    
    # Transcription
    transcript_raw = models.TextField(blank=True,
                                     help_text="Raw transcription from speech provider")
    transcript_cleaned = models.TextField(blank=True,
                                         help_text="Normalized and cleaned transcription")
    
    # Entity extraction
    extracted_entities = models.JSONField(default=dict, blank=True,
                                         help_text="Extracted fields: fish, quantity, rate, etc.")
    entity_confidence_scores = models.JSONField(default=dict, blank=True,
                                               help_text="Confidence score for each entity (0-100)")
    
    overall_confidence = models.FloatField(default=0.0,
                                          help_text="Overall extraction confidence (0-100)")
    
    # Form context
    form_type = models.CharField(max_length=20, choices=FORM_TYPE_CHOICES, default='other')
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='recording')
    
    # Processing metadata
    speech_provider = models.CharField(max_length=20, blank=True,
                                      choices=[('google', 'Google'), ('deepgram', 'Deepgram'),
                                              ('openai', 'OpenAI'), ('whisper', 'Whisper'), ('azure', 'Azure')])
    speech_provider_response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    nlp_provider = models.CharField(max_length=20, blank=True,
                                   choices=[('claude', 'Claude'), ('gpt4', 'GPT-4'), 
                                          ('llama', 'LLaMA'), ('rule_based', 'Rule-based')])
    nlp_response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    
    # Cost tracking
    speech_provider_cost = models.DecimalField(max_digits=8, decimal_places=4, default=0,
                                              help_text="Cost in USD for speech recognition")
    nlp_provider_cost = models.DecimalField(max_digits=8, decimal_places=4, default=0,
                                           help_text="Cost in USD for NLP extraction")
    
    # Error handling
    error_message = models.TextField(blank=True)
    error_type = models.CharField(max_length=50, blank=True)
    
    # User feedback
    user_correction = models.TextField(blank=True,
                                      help_text="User correction if extracted data was wrong")
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session', '-created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['audio_hash']),
        ]

    def __str__(self):
        return f"VoiceCommand {self.id} - {self.status}"


class VoiceTranscript(models.Model):
    """
    Detailed transcription metadata and provider response.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    command = models.OneToOneField(VoiceCommand, on_delete=models.CASCADE, related_name='transcript')
    
    provider = models.CharField(max_length=20)
    provider_confidence = models.FloatField(null=True, blank=True,
                                           help_text="Provider's confidence score (0-1.0)")
    
    # Alternative transcriptions (for lower confidence results)
    alternatives = models.JSONField(default=list, blank=True,
                                   help_text="Alternative transcription options")
    
    processing_time_ms = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    
    language_detected = models.CharField(max_length=20, blank=True)
    
    # Raw provider response for debugging
    provider_response = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Transcript {self.id} - {self.provider}"


class FishNameAlias(models.Model):
    """
    Fish name normalization and alias mapping.
    Maps various spellings and languages to canonical names.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='fish_aliases')
    
    # Canonical name (standardized)
    normalized_name = models.CharField(max_length=100, db_index=True)
    
    # English name
    english_name = models.CharField(max_length=100, blank=True)
    
    # Tamil name
    tamil_name = models.CharField(max_length=100, blank=True)
    
    # All aliases (various spellings, languages, slang)
    aliases = ArrayField(models.CharField(max_length=100), default=list,
                        help_text="All known variations (Tamil, Tanglish, English, slang)")
    
    # Link to Fish model if exists
    fish = models.ForeignKey(Fish, on_delete=models.SET_NULL, null=True, blank=True,
                            related_name='aliases')
    
    # Frequency tracking for learning
    usage_count = models.PositiveIntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['normalized_name']
        unique_together = ['company', 'normalized_name']
        indexes = [
            models.Index(fields=['company', 'normalized_name']),
            models.Index(fields=['company', 'usage_count']),
        ]

    def __str__(self):
        return f"{self.normalized_name} ({self.company.name})"


class VoiceCommandQueue(models.Model):
    """
    Queue for offline voice commands that need to be synced.
    Used when device is offline or during batch processing.
    """
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('synced', 'Synced'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='voice_command_queue')
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    
    # Audio data (local file path or base64 encoded)
    audio_data = models.BinaryField(help_text="Base64 encoded audio or file reference")
    audio_hash = models.CharField(max_length=64, db_index=True)
    
    metadata = models.JSONField(default=dict, blank=True,
                               help_text="Recording metadata (duration, device, etc.)")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    
    # Retry logic
    retry_count = models.PositiveIntegerField(default=0)
    last_retry = models.DateTimeField(null=True, blank=True)
    next_retry = models.DateTimeField(null=True, blank=True)
    
    # Related command once synced
    synced_command = models.OneToOneField(VoiceCommand, on_delete=models.SET_NULL,
                                         null=True, blank=True, related_name='queued_record')
    
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['company', 'status']),
        ]

    def __str__(self):
        return f"Queue {self.id} - {self.status}"


class VoiceSettings(models.Model):
    """
    User-specific voice assistant settings.
    """
    LANGUAGE_CHOICES = [
        ('tamil', 'Tamil'),
        ('english', 'English'),
        ('hindi', 'Hindi'),
        ('tanglish', 'Tanglish'),
    ]
    
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('neutral', 'Neutral'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='voice_settings')
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    
    # Language preferences
    primary_language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default='tamil')
    secondary_language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default='english', blank=True)
    
    # Voice settings
    voice_gender = models.CharField(max_length=20, choices=GENDER_CHOICES, default='female')
    voice_speed = models.FloatField(default=1.0, help_text="1.0 = normal speed")
    
    # Microphone settings
    mic_sensitivity = models.FloatField(default=1.0, help_text="0-2.0, 1.0 = default")
    noise_cancellation_enabled = models.BooleanField(default=True)
    
    # Auto-save settings
    auto_save_enabled = models.BooleanField(default=False,
                                           help_text="Auto-save if confidence > 80%")
    auto_save_confidence_threshold = models.FloatField(default=80.0)
    
    # Clarification settings
    require_confirmation = models.BooleanField(default=True,
                                              help_text="Always ask for confirmation before saving")
    confidence_threshold = models.FloatField(default=70.0,
                                            help_text="Ask clarification if below this %")
    
    # Recording settings
    max_recording_duration = models.PositiveIntegerField(default=120,
                                                        help_text="Max seconds per recording")
    auto_stop_silence_duration = models.PositiveIntegerField(default=3,
                                                            help_text="Auto-stop after N seconds of silence")
    
    # Privacy settings
    store_audio = models.BooleanField(default=True,
                                     help_text="Store audio for training/debugging")
    auto_delete_audio_days = models.PositiveIntegerField(default=30,
                                                        help_text="Auto-delete audio after N days")
    
    # Accessibility
    large_ui = models.BooleanField(default=False)
    high_contrast = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"VoiceSettings - {self.user.username}"


class VoiceAnalytics(models.Model):
    """
    Track analytics for voice assistant usage.
    Used for reporting and optimization.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='voice_analytics')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='voice_analytics')
    
    date = models.DateField(auto_now_add=True, db_index=True)
    
    # Daily stats
    total_commands = models.PositiveIntegerField(default=0)
    successful_commands = models.PositiveIntegerField(default=0)
    failed_commands = models.PositiveIntegerField(default=0)
    
    average_confidence = models.FloatField(default=0.0)
    average_response_time_ms = models.PositiveIntegerField(default=0)
    
    total_audio_duration_seconds = models.FloatField(default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    
    # Usage patterns
    form_type_breakdown = models.JSONField(default=dict,
                                          help_text="Commands by form type (purchase, sale, etc.)")
    language_breakdown = models.JSONField(default=dict,
                                         help_text="Commands by language")
    
    most_common_error = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        unique_together = ['user', 'company', 'date']
        indexes = [
            models.Index(fields=['company', 'date']),
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"Analytics - {self.user.username} - {self.date}"
