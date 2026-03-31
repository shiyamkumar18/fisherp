from django.urls import path
from .views import HealthLiveView, HealthReadyView, HealthPostgresView

urlpatterns = [
    path('', HealthLiveView.as_view(), name='health-live'),
    path('ready/', HealthReadyView.as_view(), name='health-ready'),
    path('live/', HealthLiveView.as_view(), name='health-live'),  # k8s standard
    path('postgres/', HealthPostgresView.as_view(), name='health-postgres'),
]
