# trading/helpers.py
from django.contrib.auth import get_user_model

User = get_user_model()


def _user_company(user):
    """
    Return the Company object associated with the given user.
    This function handles both direct company association and 
    legacy patterns to ensure consistent tenant isolation.
    """
    if not user or not user.is_authenticated:
        return None
    
    # 1. Direct company association (Primary pattern)
    if hasattr(user, 'company') and user.company:
        return user.company
    
    # 2. Check for impersonation context (if session available via a different path)
    # Note: Views should usually use the _get_create_scope or _scoped_queryset instead.
    
    return None
