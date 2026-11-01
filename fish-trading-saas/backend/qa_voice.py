import os, sys, django, uuid

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
from django.test import Client
from saas_platform.accounts.models import User
from core.voice.models import VoiceSession, VoiceCommand
import json

c = Client(SERVER_NAME='localhost')

admin_user = User.objects.filter(email='admin@fishapp.com').first()
trader_user = User.objects.filter(email='trader@fishapp.com').first()
store_user = User.objects.filter(email='store@fishapp.com').first()

def get_token(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    return str(RefreshToken.for_user(user).access_token)

def create_mock_command(user, entities, form_type):
    session, _ = VoiceSession.objects.get_or_create(user=user, company=user.company)
    command = VoiceCommand.objects.create(
        session=session,
        form_type=form_type,
        status='confirming',
        extracted_entities=entities,
        overall_confidence=0.9
    )
    return command.id

print("=== Testing Voice Confirmations ===")
admin_token = get_token(admin_user)
auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {admin_token}'}

# 1. Test Purchase (Admin)
purchase_entities = {
    'action': 'purchase',
    'fish_name': 'Vanjaram',
    'quantity_boxes': 20,
    'weight_kg': 37,
    'price_per_kg': 420,
    'supplier_name': 'Raja',
    'ice_cost': 1000
}
cmd_id = create_mock_command(admin_user, purchase_entities, 'purchase')
res = c.post('/api/voice/commands/confirm/', json.dumps({
    'command_id': str(cmd_id),
    'confirmed': True
}), content_type='application/json', **auth_headers)

print(f"Admin Purchase: {res.status_code}")
if res.status_code != 200:
    print(res.content)
else:
    print(f"Success! Record ID: {res.json().get('record_id')}")

# 2. Test Sale (Admin)
sale_entities = {
    'action': 'sale',
    'fish_name': 'Vanjaram',
    'quantity_boxes': 5,
    'weight_kg': 10,
    'price_per_kg': 650,
    'buyer_name': 'Muthu',
}
cmd_id = create_mock_command(admin_user, sale_entities, 'sale')
res = c.post('/api/voice/commands/confirm/', json.dumps({
    'command_id': str(cmd_id),
    'confirmed': True
}), content_type='application/json', **auth_headers)

print(f"Admin Sale: {res.status_code}")
if res.status_code != 200:
    print(res.content)
else:
    print(f"Success! Record ID: {res.json().get('record_id')}")

# 3. Test Payment (Admin)
payment_entities = {
    'action': 'payment',
    'buyer_name': 'Muthu',
    'amount_paid': 2000,
    'payment_mode': 'cash'
}
cmd_id = create_mock_command(admin_user, payment_entities, 'payment')
res = c.post('/api/voice/commands/confirm/', json.dumps({
    'command_id': str(cmd_id),
    'confirmed': True
}), content_type='application/json', **auth_headers)

print(f"Admin Payment: {res.status_code}")
if res.status_code != 200:
    print(res.content)
else:
    print(f"Success! Record ID: {res.json().get('record_id')}")

# 4. Test Role Restrictions
print("\n=== Testing Role Security ===")
trader_token = get_token(trader_user)
trader_headers = {'HTTP_AUTHORIZATION': f'Bearer {trader_token}'}

cmd_id = create_mock_command(trader_user, payment_entities, 'payment')
res = c.post('/api/voice/commands/confirm/', json.dumps({
    'command_id': str(cmd_id),
    'confirmed': True
}), content_type='application/json', **trader_headers)
print(f"Trader Payment (Should be 403): {res.status_code}")
if res.status_code >= 400:
    print(res.content)

store_token = get_token(store_user)
store_headers = {'HTTP_AUTHORIZATION': f'Bearer {store_token}'}

cmd_id = create_mock_command(store_user, sale_entities, 'sale')
res = c.post('/api/voice/commands/confirm/', json.dumps({
    'command_id': str(cmd_id),
    'confirmed': True
}), content_type='application/json', **store_headers)
print(f"Store Sale (Should be 403): {res.status_code}")
if res.status_code >= 400:
    print(res.content)
