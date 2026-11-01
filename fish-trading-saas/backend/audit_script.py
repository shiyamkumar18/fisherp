import config.python_polyfills
import os, django, sys, traceback
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.conf import settings
settings.ALLOWED_HOSTS = ['*']
settings.DEBUG = False
from django.test import Client
from django.contrib.auth import get_user_model
from saas_platform.companies.models import Company
from rest_framework_simplejwt.tokens import RefreshToken

def print_result(module, result, notes=""):
    print(f"[{module}] {'SUCCESS' if result else 'FAILED'} - {notes}")

def run_audit():
    c = Client(raise_request_exception=False, SERVER_NAME='localhost')
    User = get_user_model()
    
    # Clean up previous runs
    User.objects.filter(username__in=['audit_user_final', 't1_user_f']).delete()
    Company.objects.filter(slug='audit-c1-final').delete()
    
    # Check Auth
    print("=== 1. AUTHENTICATION ===")
    try:
        user = User.objects.create_user(username='audit_user_final', password='password123', email='audit_f@test.com')
        if user.company:
            user.company.is_verified = True
            user.company.save()
        response = c.post('/api/login/', {'identifier': 'audit_f@test.com', 'password': 'password123'}, content_type='application/json')
        print_result("Login/Token", response.status_code == 200, f"Status: {response.status_code}")
        
        token = response.json().get('access') if response.status_code == 200 else ""
        
        response2 = c.get('/api/auth/profile/', HTTP_AUTHORIZATION=f'Bearer {token}')
        print_result("Get Profile", response2.status_code == 200, f"Status: {response2.status_code}")
    except Exception as e:
        print_result("Auth", False, str(e))

    # Multi-tenancy
    print("\n=== 2. MULTI TENANCY ===")
    try:
        c1 = Company.objects.create(name='Audit C1 Final', slug='audit-c1-final')
        u1 = User.objects.create_user(username='t1_user_f', password='password123', email='t1_f@test.com', company=c1)
        t1 = str(RefreshToken.for_user(u1).access_token)
        
        res = c.get('/api/companies/', HTTP_AUTHORIZATION=f'Bearer {t1}')
        print_result("Company API", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        print_result("Tenancy", False, str(e))

    # RBAC
    print("\n=== 3. RBAC / PERMISSIONS ===")
    try:
        res = c.get('/api/platform/tenants/', HTTP_AUTHORIZATION=f'Bearer {t1}')
        print_result("Tenant Admin Accessing SAAS (Expect 403)", res.status_code == 403, f"Status: {res.status_code}")
    except Exception as e:
        print_result("RBAC", False, str(e))

    # Trading Engine
    print("\n=== 4. TRADING ENGINE ===")
    try:
        res = c.get('/api/trading/purchase-batches/', HTTP_AUTHORIZATION=f'Bearer {t1}')
        print_result("Purchases API", res.status_code == 200, f"Status: {res.status_code}")
        res = c.get('/api/trading/sales/', HTTP_AUTHORIZATION=f'Bearer {t1}')
        print_result("Sales API", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        print_result("Trading API", False, str(e))

    # Dashboard
    print("\n=== 5. DASHBOARD ===")
    try:
        res = c.get('/api/dashboard/', HTTP_AUTHORIZATION=f'Bearer {t1}')
        print_result("Dashboard API", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        print_result("Dashboard API", False, str(e))

    # Support Center
    print("\n=== 6. SUPPORT ===")
    try:
        res = c.get('/api/support/tickets/', HTTP_AUTHORIZATION=f'Bearer {t1}')
        print_result("Support API", res.status_code == 200, f"Status: {res.status_code}")
    except Exception as e:
        print_result("Support API", False, str(e))

run_audit()
