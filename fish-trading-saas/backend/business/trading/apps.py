from django.apps import AppConfig


class TradingConfig(AppConfig):
    label = 'trading'
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'business.trading'

    def ready(self):
        import business.trading.signals  # noqa: F401
