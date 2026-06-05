import requests
import sys

s = requests.Session()
r = s.post('http://localhost:5173/api/platform/auth/login/', json={
    'email': 'admin@fishapp.com', 'password': 'admin123'
})
if r.status_code != 200:
    print(f"Login failed: {r.text}")
    sys.exit(1)

r2 = s.get('http://localhost:5173/api/support/tickets/')
print(f"Type: {type(r2.json())}")
if isinstance(r2.json(), dict):
    print(f"Keys: {list(r2.json().keys())}")
