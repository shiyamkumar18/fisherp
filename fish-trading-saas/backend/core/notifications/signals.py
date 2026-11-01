from django.db.models.signals import post_save
from django.dispatch import receiver
from saas_platform.support.models import TicketMessage
from .services import NotificationService

@receiver(post_save, sender=TicketMessage)
def trigger_support_notification(sender, instance, created, **kwargs):
    """
    When a TicketMessage is created, notify the ticket creator (the tenant)
    if the message was sent by someone else (e.g. platform support).
    """
    if created:
        ticket = instance.ticket
        # If the author of the message is not the ticket creator, notify the creator.
        if instance.author != ticket.creator and not instance.is_internal:
            notification_data = {
                'title': f"New reply on ticket {ticket.ticket_number}",
                'message': f"{instance.author.username} replied: {instance.content[:50]}...",
                'category': 'support',
                'priority': 'medium',
                'icon': 'MessageSquare',
                'action_url': '/dashboard/support',
                'metadata': {'ticket_id': ticket.id}
            }
            # Notify the tenant user who created the ticket
            NotificationService.send(ticket.creator, ticket.tenant, notification_data, ticket.branch)
