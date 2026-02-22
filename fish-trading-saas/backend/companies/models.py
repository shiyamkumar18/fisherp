from django.db import models
from django_tenants.models import TenantMixin, DomainMixin


class Company(TenantMixin):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    auto_create_schema = True  # important

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass
