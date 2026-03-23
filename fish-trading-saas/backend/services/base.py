from django.db import models
from django.db.models import Q
from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model

User = get_user_model()

class CompanyManager(models.Manager):
    """
    Manager that enforces company/tenant isolation and soft delete.
    """
    
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)
    
    def for_user(self, user, include_deleted=False):
        """
        Filter queryset for specific user/company.
        Handles impersonation.
        """
        qs = self.get_queryset()
        
        if hasattr(user, 'session') and user.session.get('impersonating_company_id'):
            return qs.filter(company_id=user.session['impersonating_company_id'])
        
        if user.company_id:
            company_filter = Q(company_id=user.company_id)
        else:
            company_filter = Q(tenant_id=user.id)
        
        if include_deleted:
            qs = qs.filter(company_filter)
        else:
            qs = qs.filter(company_filter, is_deleted=False)
        
        return qs
    
    def get_for_user(self, user, *args, **kwargs):
        return self.for_user(user).get(*args, **kwargs)


class TenantObjectPermission(BasePermission):
    """
    Object-level permission: obj.company == request.user.company (or impersonated).
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if hasattr(request, 'session') and request.session.get('impersonating_company_id'):
            return obj.company_id == request.session['impersonating_company_id']
        return getattr(obj, 'company_id', None) == getattr(request.user, 'company_id', None)
