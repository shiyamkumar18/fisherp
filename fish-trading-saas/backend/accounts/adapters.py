from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom social account adapter for django-allauth to handle social logins
    in a multi-tenant environment if needed.
    """
    pass
