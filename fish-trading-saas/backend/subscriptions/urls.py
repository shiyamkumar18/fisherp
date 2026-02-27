from django.urls import path
from .views import (
    SubscriptionTierListView,
    CurrentSubscriptionView,
    CreateSubscriptionView,
    UpdateSubscriptionView,
)

urlpatterns = [
    path("subscriptions/tiers/", SubscriptionTierListView.as_view(), name="subscription-tiers"),
    path("subscriptions/current/", CurrentSubscriptionView.as_view(), name="current-subscription"),
    path("subscriptions/create/", CreateSubscriptionView.as_view(), name="create-subscription"),
    path("subscriptions/update/", UpdateSubscriptionView.as_view(), name="update-subscription"),
]
