from django.apps import AppConfig


class AccountsConfig(AppConfig):
    label = 'accounts'
    name = "saas_platform.accounts"
    
    def ready(self):
        import saas_platform.accounts.signals  # noqa: F401
