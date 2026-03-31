from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'fish-categories', views.FishCategoryViewSet, basename='fishcategory')
router.register(r'fish', views.FishViewSet, basename='fish')
router.register(r'suppliers', views.SupplierViewSet, basename='supplier')
router.register(r'buyers', views.BuyerViewSet, basename='buyer')
router.register(r'purchase-batches', views.PurchaseBatchViewSet, basename='purchasebatch')
router.register(r'sales', views.SaleViewSet, basename='sale')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'inventory', views.InventoryViewSet, basename='inventory')

urlpatterns = [
    path('', include(router.urls)),
]
