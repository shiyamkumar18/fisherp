import requests
import sys

s = requests.Session()
r = s.post('http://localhost:5173/api/platform/auth/login/', json={
    'email': 'admin@fishapp.com', 'password': 'admin123'
})
r2 = s.get('http://localhost:5173/api/platform/enterprise/revenue/')
print(f"Status: {r2.status_code}")
print(r2.text)
