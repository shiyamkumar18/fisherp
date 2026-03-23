# This will make sure the app is always imported when Django starts so Celery can register tasks
default_app_config = 'config.apps.Config'  # If needed

