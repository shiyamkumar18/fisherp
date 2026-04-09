# FisherP Demo Credentials

Created via: `python manage.py create_default_users` (DEV only)
Full seed with data: `python manage.py seed_demo_data`

## Platform Users (no company)

| Email                          | Password       | Role              |
|--------------------------------|----------------|-------------------|
| platform.operator@fishapp.com  | platform123    | Platform Operator |
| support@fishapp.com            | support123     | Platform Support  |

## Tenant 1 Company Users

| Email                  | Password       | Role         |
|------------------------|----------------|--------------|
| admin@fishapp.com      | admin123       | Tenant Admin |
| accountant@fishapp.com | accountant123  | Accountant   |
| trader@fishapp.com     | trader123      | Trader       |
| store@fishapp.com      | store123       | Store        |

## Tenant 2 Company Users

| Email                | Password    | Role         |
|----------------------|-------------|--------------|
| tenant2@fishapp.com  | tenant2123  | Tenant Admin |

## Login URL

All users: `/login` (same page, role determines sidebar/access)

## Role Permissions (Frontend)

- **admin** → All 12 sidebar sections + Settings
- **trader** → All sections except Settings
- **customer** → Dashboard, Orders, Profile only

## Notes

- Platform users can only be created via CLI (`createsuperuser`) or Django Admin (`/admin/`)
- Tenant admins can create `trader` and `store` users via API
- Registration page creates `tenant_admin` accounts
