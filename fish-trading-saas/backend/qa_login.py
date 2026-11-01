import os, django, sys
if not hasattr(sys, "argv"):
    sys.argv = ["manage.py", "shell"]

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Polyfills for Python 3.10
import enum, datetime
if not hasattr(enum, 'EnumType'): enum.EnumType = type(enum.Enum)
if not hasattr(enum, 'StrEnum'): 
    class StrEnum(str, enum.Enum): pass
    enum.StrEnum = StrEnum
if not hasattr(enum, 'property'): enum.property = property
if not hasattr(enum, 'nonmember'):
    class nonmember:
        def __init__(self, value): self.value = value
        def __get__(self, instance, owner): return self.value
    enum.nonmember = nonmember
if not hasattr(datetime, 'UTC'): datetime.UTC = datetime.timezone.utc

django.setup()
from django.conf import settings
from django.test import Client

c = Client(SERVER_NAME='localhost')

roles_to_test = [
    ('admin@fishapp.com', 'admin123', 'Tenant Admin'),
    ('accountant@fishapp.com', 'accountant123', 'Accountant'),
    ('trader@fishapp.com', 'trader123', 'Trader'),
    ('store@fishapp.com', 'store123', 'Store'),
    ('platform.operator@fishapp.com', 'platform123', 'Platform Operator'),
    ('support@fishapp.com', 'support123', 'Platform Support'),
]

print("=== Testing Login for All Roles ===")
for email, password, rolename in roles_to_test:
    res = c.post('/api/login/', {'identifier': email, 'password': password}, format='json')
    if res.status_code == 200:
        token = res.json().get('access')
        
        # Test Profile
        res2 = c.get('/api/auth/profile/', HTTP_AUTHORIZATION=f'Bearer {token}')
        print(f"{rolename} ({email}): Login SUCCESS, Profile: {res2.status_code}")
    else:
        # Some are under /api/platform/login/ ? Wait! /api/login/ is for unified login.
        print(f"{rolename} ({email}): Login FAILED with {res.status_code}: {res.content}")

