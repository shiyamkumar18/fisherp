from django.db.models import Q
from accounts.permissions import _user_company, _get_create_scope
from accounts.middleware import is_impersonating, get_impersonated_tenant

class BaseService:
    \"\"\"Base class for services with tenant scoping.\"\"\"
    
    def __init__(self, user):
        self.user = user
        self.company = self._get_company()
    
    def _get_company(self):
        if is_impersonating(self.user):
            return get_impersonated_tenant(self.user)
        return _user_company(self.user)
    
    def get_scoped_queryset(self, model):
        \"\"\"Get queryset scoped to user/company.\"\"\"
        # Assume models have .objects.for_user(user)
        return model.objects.for_user(self.user)
    
    def get_create_scope(self):
        \"\"\"Get scope for create ops.\"\"\"
        return _get_create_scope({'user': self.user})

