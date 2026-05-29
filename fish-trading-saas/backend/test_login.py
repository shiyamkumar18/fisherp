import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('DB_NAME', 'fisherp_dev')
os.environ.setdefault('DB_USER', 'fisherp_user')
os.environ.setdefault('DB_PASSWORD', 'fisherp_pass')
os.environ.setdefault('DB_HOST', 'localhost')
os.environ.setdefault('DB_PORT', '5432')
django.setup()

from django.contrib.auth import authenticate
from accounts.models import User

user = authenticate(username='admin@fishapp.com', password='admin123')
print("Authenticate admin@fishapp.com:", user)

user = authenticate(username='admin', password='admin123')
print("Authenticate admin:", user)

if user:
    print("Is active:", user.is_active)
    print("Company:", user.company.name if user.company else None)

