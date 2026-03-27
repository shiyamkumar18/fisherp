# trading/helpers.py
from django.contrib.auth import get_user_model

User = get_user_model()


def _user_company(user):
    """
    Return the company (or tenant) associated with the given user.
    This function is used to resolve the user's company/tenant
    for scoping queries and permission checks.
    """
    if not user:
        return None
    # Check for company field (introduced in User model)
    if hasattr(user, 'company') and user.company:
        return user.company
    # Fallback for legacy tenant field
    if hasattr(user, 'tenant') and user.tenant:
        return user.tenant
    return None
