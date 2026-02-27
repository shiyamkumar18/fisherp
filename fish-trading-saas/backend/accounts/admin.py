from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
import os

# Check if we're using SQLite (testing mode without PostgreSQL)
USE_SQLITE = not (os.getenv("DB_NAME") and os.getenv("DB_USER"))


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    if USE_SQLITE:
        list_display = ('username', 'email', 'phone', 'is_active', 'date_joined')
        list_filter = ('is_active', 'is_staff', 'date_joined')
        search_fields = ('username', 'email', 'phone')
        
        fieldsets = UserAdmin.fieldsets + (
            ('Additional Info', {'fields': ('phone',)}),
        )
        
        add_fieldsets = UserAdmin.add_fieldsets + (
            ('Additional Info', {'fields': ('phone',)}),
        )
    else:
        list_display = ('username', 'email', 'phone', 'schema_name', 'is_active', 'date_joined')
        list_filter = ('is_active', 'is_staff', 'date_joined')
        search_fields = ('username', 'email', 'phone', 'schema_name')
        
        fieldsets = UserAdmin.fieldsets + (
            ('Tenant Info', {'fields': ('phone', 'schema_name')}),
        )
        
        add_fieldsets = UserAdmin.add_fieldsets + (
            ('Tenant Info', {'fields': ('phone', 'schema_name')}),
        )
