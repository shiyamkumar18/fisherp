from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from business.trading.views import VoiceParserAPIView

router = DefaultRouter()
router.register(r'fish-categories', views.FishCategoryViewSet, basename='fishcategory')
router.register(r'fish', views.FishViewSet, basename='fish')
router.register(r'suppliers', views.SupplierViewSet, basename='supplier')
router.register(r'buyers', views.BuyerViewSet, basename='buyer')
router.register(r'purchase-batches', views.PurchaseBatchViewSet, basename='purchasebatch')
router.register(r'sales', views.SaleViewSet, basename='sale')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'inventory', views.InventoryViewSet, basename='inventory')
router.register(r'market-prices', views.MarketFishPriceViewSet, basename='marketprice')
router.register(r'stock-movements', views.StockMovementViewSet, basename='stockmovement')
router.register(r'whatsapp-config', views.WhatsAppConfigViewSet, basename='whatsappconfig')
router.register(r'whatsapp-logs', views.WhatsAppMessageLogViewSet, basename='whatsapplog')

urlpatterns = [
    path('', include(router.urls)),
    path('voice/parse/', VoiceParserAPIView.as_view(), name='voice-parse'),
    # Purchase creation endpoints
    path('purchase/', views.CreatePurchaseView.as_view(), name='create-purchase'),
    path('price-history/<int:fish_id>/', views.get_price_history, name='price-history'),
    path('check-duplicate/<int:fish_id>/', views.check_duplicate_purchase, name='check-duplicate'),
    path('suppliers-recent/', views.get_supplier_suggestions, name='suppliers-recent'),
    # Analytics/Reports endpoints
    path('analytics/profit-loss/', views.get_profit_loss_chart, name='profit-loss'),
    path('analytics/sold-vs-remaining/', views.get_sold_vs_remaining_chart, name='sold-vs-remaining'),
    path('analytics/demand-trend/', views.get_demand_trend_chart, name='demand-trend'),
    path('analytics/batch-performance/', views.get_batch_performance_chart, name='batch-performance'),
    path('analytics/loss-analysis/', views.get_loss_analysis_chart, name='loss-analysis'),
    path('analytics/payment-analysis/', views.get_payment_analysis_chart, name='payment-analysis'),
    path('analytics/price-trend/', views.get_price_trend_chart, name='price-trend'),
    path('analytics/profit-trend/', views.get_profit_trend_chart, name='profit-trend'),
    path('analytics/smart-insights/', views.get_smart_insights, name='smart-insights'),
    path('analytics/dashboard-summary/', views.get_dashboard_summary, name='dashboard-summary'),
]
