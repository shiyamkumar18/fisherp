from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ObjectDoesNotExist


class FishCategory(models.Model):
    CATEGORY_TYPE_CHOICES = [
        ('freshwater', 'Freshwater'),
        ('saltwater', 'Saltwater'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPE_CHOICES, default='saltwater',
                                     help_text="Whether this is freshwater or saltwater fish")
    description = models.TextField(blank=True, null=True)
    icon = models.ImageField(
        upload_to='fish_category_icons/', blank=True, null=True,
        help_text="Icon image for the category",
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])]
    )
    color_code = models.CharField(max_length=7, blank=True, null=True,
                                  help_text="Hex color code for UI (e.g., #FF5733)")
    priority = models.PositiveIntegerField(default=0,
                                           help_text="Display order priority (lower = first)")
    is_featured = models.BooleanField(default=False,
                                      help_text="Show this category in featured section")
    is_active = models.BooleanField(default=True, help_text="Active category")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Fish Categories"
        ordering = ['priority', 'name']

    def __str__(self):
        try:
            return f"{self.name} ({self.get_category_type_display()})"
        except (AttributeError, ObjectDoesNotExist):
            return "Unknown Category"
