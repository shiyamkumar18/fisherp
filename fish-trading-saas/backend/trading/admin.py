"""
Admin configuration for Trading models.
✅ RESOLVED: Improved admin interface with better list_display, search_fields, list_filter, and fieldsets
"""
from django.contrib import admin
from django import forms
from .models import Fish, Buyer, PurchaseBatch, Sale


@admin.register(Fish)
class FishAdmin(admin.ModelAdmin):
    """Admin for Fish model"""
    list_display = ('name', 'company')
    search_fields = ('name',)
    list_filter = ('company',)


@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    """Admin for Buyer model"""
    list_display = ('name', 'phone', 'company')
    search_fields = ('name', 'phone')
    list_filter = ('company',)


@admin.register(PurchaseBatch)
class PurchaseBatchAdmin(admin.ModelAdmin):
    """
    Admin for PurchaseBatch model
    ✅ RESOLVED: Added fieldsets, improved list_display, search_fields, and list_filter
    """
    readonly_fields = (
        "total_weight",
        "fish_cost",
        "total_expense",
        "actual_cost_per_kg",
        "cost_per_package",
        "pending_amount",
    )
    
    list_display = (
        "id",
        "date",
        "fisherman_name",
        "fish",
        "purchase_type",
        "number_of_packages",
        "total_expense",
        "amount_paid",
        "pending_amount",
    )
    
    search_fields = ('fisherman_name', 'place_of_buying', 'fish__name')
    list_filter = ('purchase_type', 'date', 'fish', 'company')
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('company', 'fish', 'purchase_type', 'date')
        }),
        ('Fisherman Info', {
            'fields': ('fisherman_name', 'place_of_buying')
        }),
        ('Package Details', {
            'fields': ('number_of_packages', 'package_weight', 'price_per_kg')
        }),
        ('Additional Costs', {
            'fields': ('labour_cost', 'ice_cost', 'transport_cost', 'commission_cost', 'other_cost')
        }),
        ('Payment', {
            'fields': ('amount_paid',)
        }),
        ('Calculated Fields (Read-only)', {
            'fields': ('total_weight', 'fish_cost', 'total_expense', 'actual_cost_per_kg', 'cost_per_package', 'pending_amount'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    """
    Admin for Sale model
    ✅ RESOLVED: Added fieldsets, improved list_display, search_fields, and list_filter
    """
    readonly_fields = (
        "total_revenue",
        "total_cost",
        "profit",
        "pending_amount",
    )
    
    list_display = (
        "id",
        "date",
        "batch",
        "buyer",
        "number_of_packages_sold",
        "total_revenue",
        "total_cost",
        "profit",
        "amount_received",
        "pending_amount",
    )
    
    search_fields = ('buyer__name', 'batch__fisherman_name', 'batch__fish__name')
    list_filter = ('date', 'buyer', 'company')
    
    fieldsets = (
        ('Sale Info', {
            'fields': ('company', 'batch', 'buyer', 'date')
        }),
        ('Selling Details', {
            'fields': ('number_of_packages_sold', 'selling_weight_per_package', 'selling_price_per_kg')
        }),
        ('Payment', {
            'fields': ('amount_received',)
        }),
        ('Calculated Fields (Read-only)', {
            'fields': ('total_revenue', 'total_cost', 'profit', 'pending_amount'),
            'classes': ('collapse',)
        }),
    )

