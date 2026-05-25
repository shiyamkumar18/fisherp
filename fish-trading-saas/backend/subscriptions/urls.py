from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionTierListView,
    SubscriptionAddOnListView,
    CurrentSubscriptionView,
    CreateSubscriptionView,
    UpdateSubscriptionView,
    PurchaseAddOnView,
    CancelAddOnView,
    CheckFeatureAccessView,
    SubscriptionViewSet,
    SubscriptionTierViewSet,
)

router = DefaultRouter()
router.register(r"subscriptions", SubscriptionViewSet, basename="subscriptions")
router.register(r"subscription-tiers", SubscriptionTierViewSet, basename="subscription-tiers")

urlpatterns = [
    # Tier endpoints
    path("tiers/", SubscriptionTierListView.as_view(), name="tiers"),
    path("subscriptions/tiers/", SubscriptionTierListView.as_view(), name="subscription-tiers"),
    
    # Add-on endpoints
    path("subscriptions/addons/", SubscriptionAddOnListView.as_view(), name="subscription-addons"),
    path("subscriptions/addons/purchase/", PurchaseAddOnView.as_view(), name="purchase-addon"),
    path("subscriptions/addons/cancel/", CancelAddOnView.as_view(), name="cancel-addon"),
    
    # Subscription endpoints
    path("subscriptions/current/", CurrentSubscriptionView.as_view(), name="current-subscription"),
    path("subscriptions/create/", CreateSubscriptionView.as_view(), name="create-subscription"),
    path("subscriptions/update/", UpdateSubscriptionView.as_view(), name="update-subscription"),
    path("subscriptions/upgrade/", UpdateSubscriptionView.as_view(), name="upgrade-subscription"),
    
    # Feature access
    path("subscriptions/check-feature/", CheckFeatureAccessView.as_view(), name="check-feature"),
    # Backward-compatible CRUD endpoints
    path("", include(router.urls)),
]
