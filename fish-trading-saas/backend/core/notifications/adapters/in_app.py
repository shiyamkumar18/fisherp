from .base import BaseNotificationProvider
from core.notifications.models import Notification

class InAppProvider(BaseNotificationProvider):
    def send(self, notification_data, user, company, branch=None):
        # We simply save it to the DB so the frontend can pull it.
        # notification_data is a dict with title, message, category, etc.
        Notification.objects.create(
            user=user,
            company=company,
            branch=branch,
            **notification_data
        )
