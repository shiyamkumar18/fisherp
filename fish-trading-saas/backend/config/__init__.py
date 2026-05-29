# Monkeypatches for compatibility with Django 6 running on Python 3.10
import datetime
import enum

if not hasattr(datetime, 'UTC'):
    setattr(datetime, 'UTC', datetime.timezone.utc)

if not hasattr(enum, 'EnumType'):
    setattr(enum, 'EnumType', enum.EnumMeta)

if not hasattr(enum, 'StrEnum'):
    class StrEnum(str, enum.Enum):
        pass
    setattr(enum, 'StrEnum', StrEnum)

if not hasattr(enum, 'property'):
    setattr(enum, 'property', property)

if not hasattr(enum, 'nonmember'):
    class nonmember:
        def __init__(self, value):
            self.value = value
        def __get__(self, instance, owner):
            return self.value
    setattr(enum, 'nonmember', nonmember)




# This will make sure the app is always imported when Django starts so Celery can register tasks
default_app_config = 'config.apps.Config'  # If needed

