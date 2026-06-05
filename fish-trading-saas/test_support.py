import requests
import sys

s = requests.Session()
r = s.post('http://localhost:5173/api/platform/auth/login/', json={
    'email': 'admin@fishapp.com', 'password': 'admin123'
})
if r.status_code != 200:
    print(f"Login failed: {r.text}")
    sys.exit(1)

# The frontend uses core/apiClient for SupportDeskPage, which goes to `/api/support/tickets/`
# Actually, wait, is it `/api/support/tickets/` or `/api/platform/support/tickets/`?
# In adminService.js I put: export const getSupportTickets = () => api.get("/support/tickets/");
# Let's see if that endpoint returns 200
r2 = s.get('http://localhost:5173/api/support/tickets/')
print(f"Status: {r2.status_code}")
print(r2.text[:200])
