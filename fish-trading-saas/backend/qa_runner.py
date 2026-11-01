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
from django.contrib.auth import get_user_model
from saas_platform.companies.models import Company
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
c = Client(SERVER_NAME='localhost')

def get_token(user):
    return str(RefreshToken.for_user(user).access_token)

# 1. Setup Demo Data
print("Setting up QA users...")
company, _ = Company.objects.get_or_create(name='QA Company', slug='qa-company', is_active=True)
admin, _ = User.objects.get_or_create(username='qa_admin', email='qa_admin@test.com', company=company)
admin.role = 'tenant_admin'
admin.save()

platform_op, _ = User.objects.get_or_create(username='qa_platform', email='qa_platform@test.com')
platform_op.role = 'platform_operator'
platform_op.is_superuser = True
platform_op.save()

# Ensure we have a FishCategory and a Fish for purchases
from business.trading.models import FishCategory, Fish, Buyer, PurchaseBatch
category, _ = FishCategory.objects.get_or_create(name='Seafood', defaults={'category_type': 'fish'})
fish, _ = Fish.objects.get_or_create(
    name='Vanjaram', 
    company=company, 
    defaults={'category': category, 'tenant': admin, 'unit_type': 'kg'}
)
buyer, _ = Buyer.objects.get_or_create(
    name='New QA Buyer', 
    company=company, 
    defaults={'tenant': admin, 'credit_limit': 100000}
)

admin_token = get_token(admin)
platform_token = get_token(platform_op)

# 2. Test Dashboard APIs
print("\n--- Dashboard ---")
res = c.get('/api/dashboard/', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
print(f"Dashboard KPIs: {res.status_code}")
if res.status_code != 200:
    print("Error:", res.content)

# 3. Test Purchases APIs
print("\n--- Purchases ---")
res = c.post('/api/purchase/', {
    'supplier_name': 'New QA Supplier',
    'items': [{
        'product_id': fish.id,
        'qty': 10,
        'cost_price': 500
    }],
    'payment_method': 'cash',
    'amount_paid': 5000,
}, HTTP_AUTHORIZATION=f'Bearer {admin_token}', content_type='application/json')
print(f"Create Purchase: {res.status_code}")
if res.status_code != 201 and res.status_code != 200:
    print("Error:", res.content)

res = c.get('/api/purchase-batches/', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
print(f"List Purchase Batches: {res.status_code}")
if res.status_code != 200:
    print("Error:", res.content)

# 4. Test Sales APIs
print("\n--- Sales ---")
batch = PurchaseBatch.objects.filter(company=company).latest('id')
res = c.post('/api/sales/', {
    'batch': batch.id if batch else None,
    'buyer': buyer.id,
    'number_of_packages_sold': 1,
    'selling_weight_per_package': 5,
    'selling_price_per_kg': 600,
}, HTTP_AUTHORIZATION=f'Bearer {admin_token}', content_type='application/json')
print(f"Create Sale: {res.status_code}")
if res.status_code not in [201, 200]:
    print("Error:", res.content)

res = c.get('/api/sales/', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
print(f"List Sales: {res.status_code}")
if res.status_code != 200:
    print("Error:", res.content)

# 5. Test Platform Manager
print("\n--- Platform Manager ---")
res = c.get('/api/platform/tenants/', HTTP_AUTHORIZATION=f'Bearer {platform_token}')
print(f"Platform Tenants: {res.status_code}")
if res.status_code != 200:
    print("Error:", res.content)

res = c.get('/api/platform/dashboard/', HTTP_AUTHORIZATION=f'Bearer {platform_token}')
print(f"Platform Dashboard: {res.status_code}")
if res.status_code != 200:
    print("Error:", res.content)

# 6. Test Platform Impersonation Leak
print("\n--- Security: Tenant accessing Platform ---")
res = c.get('/api/platform/tenants/', HTTP_AUTHORIZATION=f'Bearer {admin_token}')
print(f"Tenant accessing Platform Tenants (Expect 403): {res.status_code}")
if res.status_code != 403:
    print("Error: RBAC Leak!")

print("\nQA Complete.")
