import logging
import re

from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)


def _normalize_ip(ip_address):
    """Return a DB-safe IP string for login attempt records."""
    return ip_address or ""


def get_client_ip(request):
    """
    Retrieve the client's IP address from the request.
    Handles proxies via X-Forwarded-For.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return _normalize_ip(ip)


def get_user_role(user):
    """
    Return the user's role as a string.
    Assumes user has a 'role' attribute.
    """
    if getattr(user, "is_superuser", False):
        return "platform_maintainer"
    return getattr(user, "role", None)


def normalize_tenant_role(role, default="trader"):
    """Normalize incoming tenant role values, including legacy aliases."""
    role_map = {
        "sales_staff": "trader",
        "store_accounts": "store",
        "trader": "trader",
        "store": "store",
    }
    return role_map.get((role or "").strip(), default)


def user_role_flags(user):
    """Return standard role flags used by legacy and package views."""
    return {
        "is_tenant_admin": getattr(user, "is_tenant_admin", False),
        "is_accountant": getattr(user, "is_accountant", False),
        "is_trader": getattr(user, "is_trader", False),
        "is_store": getattr(user, "is_store", False),
        "is_sales_staff": getattr(user, "is_sales_staff", False),
        "is_store_accounts": getattr(user, "is_store_accounts", False),
        "is_platform_operator": getattr(user, "is_platform_operator", False),
        "is_platform_support": getattr(user, "is_platform_support", False),
        "is_platform_super_admin": getattr(user, "is_platform_super_admin", False),
        "is_platform_maintainer": getattr(user, "is_platform_maintainer", False),
    }


def get_tenant_from_request(request):
    """
    Retrieve the tenant (company) associated with the current request.
    Returns None if not authenticated or no company.
    """
    if hasattr(request, 'user') and request.user.is_authenticated:
        return getattr(request.user, 'company', None)
    return None


def log_user_activity(request, action, details=None):
    """
    Log user activity (login, logout, etc.).
    Placeholder: logs to console. Replace with DB logging if model exists.
    """
    user = request.user if hasattr(request, 'user') else None
    username = user.username if user and user.is_authenticated else 'Anonymous'
    ip = get_client_ip(request)
    log_entry = f"[Activity] User: {username}, Action: {action}, IP: {ip}"
    if details:
        log_entry += f", Details: {details}"
    logger.info(log_entry)

    # Optional: Save to database (uncomment if you have a UserActivityLog model)
    # try:
    #     from accounts.models import UserActivityLog
    #     UserActivityLog.objects.create(
    #         user=user,
    #         action=action,
    #         ip_address=ip,
    #         details=details
    #     )
    # except Exception as e:
    #     logger.error(f"Failed to log activity to DB: {e}")


def get_subscription_for_user(user):
    """Resolve the active subscription by company first, then legacy tenant fallback."""
    from subscriptions.models import Subscription

    qs = Subscription.objects.all().order_by("-created_at")
    if getattr(user, "company_id", None):
        return qs.filter(company=user.company).first()
    return qs.filter(tenant=user).first()


def check_failed_login_attempts(email):
    """Check whether an identity has exceeded the configured failed login limit."""
    from django.conf import settings
    from accounts.models_audit import LoginAttempt

    max_attempts = getattr(settings, "AUTH_LOGIN_ATTEMPT_LIMIT", 5)
    lockout_minutes = getattr(settings, "AUTH_LOCKOUT_DURATION_MINUTES", 15)
    failed_count = LoginAttempt.get_failed_attempts(email, minutes=lockout_minutes)

    if failed_count >= max_attempts:
        return True, None
    return False, None


def record_failed_login(email, ip_address="", user_agent=""):
    """Persist a failed login attempt."""
    from accounts.models_audit import LoginAttempt

    LoginAttempt.record_attempt(
        email,
        _normalize_ip(ip_address),
        status="failed",
        user_agent=user_agent,
    )


def record_successful_login(email, ip_address="", user_agent=""):
    """Persist a successful login attempt."""
    from accounts.models_audit import LoginAttempt

    LoginAttempt.record_attempt(
        email,
        _normalize_ip(ip_address),
        status="success",
        user_agent=user_agent,
    )


def clear_failed_login(email):
    """Clear failed login attempts after a successful authentication."""
    from accounts.models_audit import LoginAttempt

    LoginAttempt.objects.filter(email=email, status="failed").delete()


def validate_password_strength(password):
    """
    Validate password strength:
    - Min 12 chars
    - At least 1 uppercase
    - At least 1 number
    - At least 1 special character
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least 1 uppercase letter"

    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least 1 number"

    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least 1 special character"

    return True, None


def get_tokens_for_user(user):
    """
    Production‑grade JWT with custom claims.
    Used for:
    - Role‑based UI routing
    - Tenant isolation
    - Platform access control
    """
    refresh = RefreshToken.for_user(user)

    # Safe values – handle cases where user.company might be None
    company_id = user.company_id if hasattr(user, 'company_id') else None
    company_slug = user.company.slug if user.company else None

    claims = {
        "role": user.role,
        "company_id": company_id,
        "is_platform_user": user.is_platform_user,
        "company_slug": company_slug,
    }

    # Add to refresh token
    for key, value in claims.items():
        refresh[key] = value

    # Explicitly add to access token (optional – simplejwt copies from refresh by default)
    access = refresh.access_token
    for key, value in claims.items():
        access[key] = value

    return {
        "refresh": str(refresh),
        "access": str(access),
    }
