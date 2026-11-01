from .models import NotificationPreference
from .adapters.in_app import InAppProvider
from .adapters.email import EmailProvider

class NotificationService:
    @staticmethod
    def send(user, company, notification_data, branch=None):
        """
        Orchestrates sending a notification through configured channels.
        notification_data expects: title, message, category, priority, icon, action_url
        """
        # Always send In-App
        in_app_provider = InAppProvider()
        in_app_provider.send(notification_data, user, company, branch)

        # Check preferences for other channels
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        category = notification_data.get('category')

        if prefs.email_enabled and category not in prefs.opt_out_categories:
            email_provider = EmailProvider()
            email_provider.send(notification_data, user, company, branch)
            
        # SMS, WhatsApp, Push can be added here seamlessly.

    @staticmethod
    def broadcast_to_role(company, role_name, notification_data, branch=None):
        """
        Sends to all users in a company with a specific role.
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # This assumes user model has a `role` field as defined in standard setups.
        # Adjust logic if roles are linked differently (e.g. StaffProfile).
        users = User.objects.filter(company=company, role=role_name)
        if branch:
            # If your user model has a branch link, filter by it. 
            pass 
            
        for user in users:
            NotificationService.send(user, company, notification_data, branch)
