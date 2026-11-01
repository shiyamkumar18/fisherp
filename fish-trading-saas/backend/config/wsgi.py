"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import enum
import datetime

# --- Python 3.11+ Polyfills for Django 6.0 on Python 3.10 ---
if not hasattr(enum, 'EnumType'):
    enum.EnumType = type(enum.Enum)
if not hasattr(enum, 'StrEnum'):
    class StrEnum(str, enum.Enum): pass
    enum.StrEnum = StrEnum
if not hasattr(enum, 'property'):
    enum.property = property
if not hasattr(enum, 'nonmember'):
    class nonmember:
        def __init__(self, value): self.value = value
        def __get__(self, instance, owner): return self.value
    enum.nonmember = nonmember
if not hasattr(datetime, 'UTC'):
    datetime.UTC = datetime.timezone.utc
# -----------------------------------------------------------

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
