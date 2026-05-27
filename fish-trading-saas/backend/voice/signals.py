"""
Voice App Signals
Handles post-save and pre-save signals for voice models.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from voice.models import VoiceCommand, VoiceSession, VoiceAnalytics


@receiver(post_save, sender=VoiceCommand)
def update_session_stats(sender, instance, created, **kwargs):
    """Update session statistics when a command is saved"""
    if created or instance.status in ['confirmed', 'failed']:
        session = instance.session
        
        # Recalculate stats
        commands = VoiceCommand.objects.filter(session=session)
        session.total_commands = commands.count()
        session.successful_commands = commands.filter(status__in=['confirmed', 'saved']).count()
        session.failed_commands = commands.filter(status='failed').count()
        session.save()


@receiver(post_save, sender=VoiceCommand)
def track_analytics(sender, instance, created, **kwargs):
    """Track voice analytics"""
    if instance.status in ['confirmed', 'saved', 'failed']:
        today = timezone.now().date()
        
        analytics, _ = VoiceAnalytics.objects.get_or_create(
            user=instance.session.user,
            company=instance.session.company,
            date=today
        )
        
        # Update analytics
        commands = VoiceCommand.objects.filter(
            session__user=instance.session.user,
            session__company=instance.session.company,
            created_at__date=today
        )
        
        analytics.total_commands = commands.count()
        analytics.successful_commands = commands.filter(status__in=['confirmed', 'saved']).count()
        analytics.failed_commands = commands.filter(status='failed').count()
        
        # Calculate average confidence
        total_confidence = sum(c.overall_confidence for c in commands if c.overall_confidence)
        if commands.exists():
            analytics.average_confidence = total_confidence / commands.count()
        
        # Calculate average response time
        total_response_time = sum(
            c.speech_provider_response_time_ms + c.nlp_response_time_ms
            for c in commands
            if c.speech_provider_response_time_ms and c.nlp_response_time_ms
        )
        if commands.exists():
            analytics.average_response_time_ms = total_response_time / commands.count()
        
        # Calculate total cost
        total_cost = sum(
            c.speech_provider_cost + c.nlp_provider_cost
            for c in commands
        )
        analytics.total_cost = total_cost
        
        # Form type breakdown
        form_breakdown = {}
        for cmd in commands:
            form_type = cmd.form_type
            form_breakdown[form_type] = form_breakdown.get(form_type, 0) + 1
        analytics.form_type_breakdown = form_breakdown
        
        # Language breakdown
        language_breakdown = {}
        for session in VoiceSession.objects.filter(
            user=instance.session.user,
            company=instance.session.company,
            created_at__date=today
        ):
            lang = session.language
            language_breakdown[lang] = language_breakdown.get(lang, 0) + session.total_commands
        analytics.language_breakdown = language_breakdown
        
        # Most common error
        errors = commands.filter(status='failed').values_list('error_type', flat=True)
        if errors:
            error_counts = {}
            for error in errors:
                error_counts[error] = error_counts.get(error, 0) + 1
            analytics.most_common_error = max(error_counts, key=error_counts.get)
        
        analytics.save()
