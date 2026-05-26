from django.db import models
from django.utils import timezone
from .fish import Fish
from services.base import CompanyManager

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

    objects = CompanyManager()
    all_objects = models.Manager()

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['company', 'fish']),
            models.Index(fields=['city', 'recorded_at']),
        ]

    def __str__(self):
        return f"{self.fish.name} in {self.city} - {self.price_per_kg}/kg at {self.recorded_at.date()}"
