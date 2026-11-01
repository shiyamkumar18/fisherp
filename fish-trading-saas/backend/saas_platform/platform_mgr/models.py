from django.db import models
from django.conf import settings

class PlatformIncident(models.Model):
    STATUS_CHOICES = [
        ('investigating', 'Investigating'),
        ('identified', 'Identified'),
        ('monitoring', 'Monitoring'),
        ('resolved', 'Resolved'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low (Minor issue)'),
        ('medium', 'Medium (Degraded performance)'),
        ('high', 'High (Partial outage)'),
        ('critical', 'Critical (Major outage)'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(help_text="Detailed description of the incident")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='investigating')
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reported_incidents')
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"[{self.get_status_display()}] {self.title}"
