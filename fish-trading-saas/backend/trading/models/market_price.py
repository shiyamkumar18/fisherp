from django.db import models
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from .fish import Fish
from services.base import CompanyManager

class MarketFishPriceManager(CompanyManager):
    def get_effective_price(self, fish, city, company=None):
        """
        Priority 1: Tenant custom price
        Priority 2: Fallback global price
        """
        qs = self.get_queryset().filter(fish=fish, city=city).order_by('-recorded_at')
        
        if company:
            tenant_price = qs.filter(company=company, is_global=False).first()
            if tenant_price:
                return tenant_price
                
        # Fallback to global
        global_price = qs.filter(company__isnull=True, is_global=True).first()
        return global_price

    def get_market_average(self, fish, company=None):
        """Safely compute average using effective prices across cities."""
        # For average, we need to gather the effective price per city.
        cities = self.get_queryset().filter(fish=fish).values_list('city', flat=True).distinct()
        prices = []
        for city in cities:
            eff_price = self.get_effective_price(fish, city, company)
            if eff_price:
                prices.append(eff_price.price_per_kg)
                
        if not prices:
            return None
        from decimal import Decimal
        return sum(prices) / Decimal(str(len(prices)))

    def get_city_prices(self, city, company=None):
        """Get effective prices for all fish in a city."""
        fishes = self.get_queryset().filter(city=city).values_list('fish', flat=True).distinct()
        prices = []
        for fish_id in fishes:
            eff_price = self.get_effective_price(fish_id, city, company)
            if eff_price:
                prices.append(eff_price)
        return prices

class MarketFishPrice(models.Model):
    CITY_CHOICES = [
        ('chennai', 'Chennai'),
        ('nagapattinam', 'Nagapattinam'),
        ('tuticorin', 'Tuticorin'),
        ('kasimedu', 'Kasimedu'),
        ('rameswaram', 'Rameswaram'),
        ('kanyakumari', 'Kanyakumari'),
        ('kochi', 'Kochi'),
        ('vizag', 'Vizag'),
    ]

    fish = models.ForeignKey(Fish, on_delete=models.CASCADE, related_name='market_prices')
    city = models.CharField(max_length=50, choices=CITY_CHOICES)
    market_name = models.CharField(max_length=150)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=50, default='manual')
    confidence_score = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)
    recorded_at = models.DateTimeField(default=timezone.now)
    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, null=True, blank=True, related_name='market_prices')
    is_global = models.BooleanField(default=False, help_text="True if this is a platform-managed global price.")

    objects = MarketFishPriceManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['company', 'fish', 'city', 'recorded_at']),
            models.Index(fields=['fish', 'city', 'recorded_at']),
            models.Index(fields=['company', 'fish']),
            models.Index(fields=['city', 'recorded_at']),
        ]

    def __str__(self):
        fish_name = "Unknown"
        try:
            if self.fish:
                fish_name = self.fish.name
        except (AttributeError, ObjectDoesNotExist):
            pass
        return f"{fish_name} in {self.city} - {self.price_per_kg}/kg at {self.recorded_at.date()}"

    def save(self, *args, **kwargs):
        # Determine company dynamically if missing and not explicitly global
        if not self.company_id and not self.is_global:
            try:
                if self.fish and getattr(self.fish, 'company_id', None):
                    self.company = self.fish.company
            except (AttributeError, ObjectDoesNotExist):
                pass
                
        # Enforce safety rules
        if self.is_global and self.company_id is not None:
            raise ValidationError("A global price cannot belong to a specific company.")
            
        if self.company_id is not None:
            self.is_global = False
            
        if self.company_id is None and not self.is_global:
            # If company is strictly None, it must be global
            self.is_global = True

        super().save(*args, **kwargs)
