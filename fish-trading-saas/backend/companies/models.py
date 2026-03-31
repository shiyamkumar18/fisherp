from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Company(models.Model):
    """Company/Tenant model for the SaaS application"""
    name = models.CharField(max_length=200)
    slug = models.CharField(max_length=100, unique=True, help_text="URL-friendly company identifier", default="public")
    phone = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Business Information
    business_registration_number = models.CharField(max_length=100, blank=True, null=True,
                                                    help_text="Company registration/Business ID")
    gst_number = models.CharField(max_length=50, blank=True, null=True, help_text="GST/Tax ID")
    pan_number = models.CharField(max_length=20, blank=True, null=True, help_text="PAN/TAN number")
    tan_number = models.CharField(max_length=20, blank=True, null=True, help_text="Tax deduction number")
    
    # Branding
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    
    # Address Information
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True, default='India')
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    
    # Business Type
    BUSINESS_TYPE_CHOICES = [
        ('proprietorship', 'Proprietorship'),
        ('partnership', 'Partnership'),
        ('llp', 'Limited Liability Partnership'),
        ('pvt_ltd', 'Private Limited'),
        ('public_ltd', 'Public Limited'),
        ('cooperative', 'Cooperative'),
        ('other', 'Other'),
    ]
    business_type = models.CharField(max_length=20, choices=BUSINESS_TYPE_CHOICES, blank=True, null=True)
    
    # Industry Information
    INDUSTRY_CHOICES = [
        ('fishing', 'Fishing & Aquaculture'),
        ('seafood_processing', 'Seafood Processing'),
        ('seafood_export', 'Seafood Export'),
        ('seafood_retail', 'Seafood Retail'),
        ('restaurant', 'Restaurant/Hotel'),
        ('wholesale', 'Wholesale Trading'),
        ('other', 'Other'),
    ]
    industry_type = models.CharField(max_length=25, choices=INDUSTRY_CHOICES, default='fishing')
    
    # Company Size
    employee_count = models.PositiveIntegerField(null=True, blank=True, help_text="Number of employees")
    annual_turnover = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True,
                                          help_text="Annual turnover in local currency")
    
    # Settings and Preferences (JSON field for flexibility)
    settings = models.JSONField(default=dict, blank=True, 
                                help_text="Company-specific settings and preferences")
    
    # Admin User (Company Admin)
    admin = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_companies',
        help_text="Primary admin user for this company"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False, help_text="Verified company")
    verification_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
    
    def get_full_address(self):
        """Return formatted full address"""
        parts = [self.address_line1, self.address_line2, self.city, self.state,
             self.postal_code, self.country]
        return ", ".join(filter(None, parts))
    
    def get_primary_contact(self):
        """Return primary contact information"""
        return {
            'phone': self.phone,
            'email': self.email,
        }
    
    def get_user_count(self):
        """Get number of users in this company"""
        return User.objects.filter(company=self).count()
    
    def can_add_user(self, max_users=3):
        """Check if more users can be added"""
        return self.get_user_count() < max_users
    
    @property
    def login_url(self):
        """Get the tenant-specific login URL"""
        return f"/login/{self.slug}/"
    
    @property
    def register_url(self):
        """Get the tenant-specific registration URL"""
        return f"/register/{self.slug}/"
    
    @property
    def is_tenant_active(self):
        """Check if tenant is active and verified"""
        return self.is_active and self.is_verified
    
    def get_login_context(self):
        """Get context for login page rendering"""
        return {
            'company_name': self.name,
            'company_slug': self.slug,
            'login_url': self.login_url,
            'register_url': self.register_url,
            'is_active': self.is_tenant_active,
            'logo_url': self.logo.url if self.logo else None,
            'primary_color': self.settings.get('primary_color', '#667eea'),
        }


class Domain(models.Model):
    """Domain configuration for company (simplified for non-multi-tenant)"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='domains')
    domain = models.CharField(max_length=253, unique=True, help_text="Domain name")
    is_primary = models.BooleanField(default=True, help_text="Primary domain for this company")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', '-created_at']
    
    def __str__(self):
        return self.domain
