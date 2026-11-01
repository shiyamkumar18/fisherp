from django.core.mail import send_mail
from django.conf import settings
from .base import BaseNotificationProvider

class EmailProvider(BaseNotificationProvider):
    def send(self, notification_data, user, company, branch=None):
        if not user.email:
            return
            
        subject = f"[{company.name}] {notification_data.get('title', 'New Notification')}"
        message = notification_data.get('message', '')
        
        # In a real production app, we would render an HTML template here.
        # e.g., html_message = render_to_string('emails/notification.html', context)
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@fisherp.com'),
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as e:
            # Log failure but don't crash
            pass
