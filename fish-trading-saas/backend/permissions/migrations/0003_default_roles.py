"""
Migration: Default Role-Based Permission Matrix
================================================
Implements production-grade RBAC defaults for all 14 system roles.

Rules:
  - Idempotent (safe to re-run)
  - Least privilege principle
  - Finance-safe restrictions
  - Multi-tenant isolation enforced at model level

Roles:
  1. System Admin       - ALL permissions
  2. Tenant Admin       - All EXCEPT admin_override, platform settings
  3. Branch Manager     - Branch ops, no finance/users/settings
  4. Finance Manager    - Full finance authority
  5. Accountant         - Daily finance, no delete/approve/admin
  6. Purchase Manager   - Procurement, no full accounting
  7. Inventory Manager  - Stock, no accounting/payments
  8. Auction Manager    - Auctions + fish trading, no finance
  9. Sales Staff        - Sales/orders/customers only
 10. Trader             - Fish trading + orders
 11. Store / Inventory Staff - Warehouse ops, no finance
 12. Supervisor         - Read-only dashboard
 13. Staff              - Basic view+limited create/edit
 14. Viewer             - Read-only everywhere
"""
from django.db import migrations

# ---------------------------------------------------------------------------
# Permission matrix definition
# Key:   role name (must match Role.name in DB)
# Value: dict describing which module+action combos are ALLOWED (True)
#
# Shorthand helpers used:
#   ALL_ACTIONS  - every action string
#   NO_ACTIONS   - empty set (role has no access to that module)
#
# Format:
#   ROLE_MATRIX[role_name][module] = list of allowed action strings
#   OR
#   ROLE_MATRIX[role_name] = '__all__'   → grant every permission
# ---------------------------------------------------------------------------

ALL_MODULES = [
    'dashboard', 'sales', 'purchases', 'inventory', 'accounting',
    'catalog', 'orders', 'reports', 'users', 'settings', 'customers',
    'suppliers', 'payments', 'financials', 'auctions', 'fish_trading',
    'crm', 'branches', 'warehouse', 'notifications', 'audit_logs',
]

ALL_ACTIONS = [
    'view', 'create', 'edit', 'delete', 'approve',
    'export', 'print', 'financial_access', 'settings_access', 'admin_override',
]

# Compact helpers
_full  = ALL_ACTIONS          # full access to a module
_view  = ['view']             # read-only
_vc    = ['view', 'create']
_vce   = ['view', 'create', 'edit']
_vced  = ['view', 'create', 'edit', 'delete']

# Tenant Admin gets everything except admin_override
_ta_full = [a for a in ALL_ACTIONS if a != 'admin_override']

ROLE_MATRIX = {

    # ─────────────────────────────────────────────
    # 1. SYSTEM ADMIN – unrestricted
    # ─────────────────────────────────────────────
    'System Admin': '__all__',

    # ─────────────────────────────────────────────
    # 2. TENANT ADMIN – full tenant, no platform
    # ─────────────────────────────────────────────
    'Tenant Admin': {
        'dashboard':     _ta_full,
        'sales':         _ta_full,
        'purchases':     _ta_full,
        'inventory':     _ta_full,
        'accounting':    ['view', 'create', 'edit', 'export', 'print', 'financial_access'],
        'catalog':       _ta_full,
        'orders':        _ta_full,
        'reports':       _ta_full,
        'users':         ['view', 'create', 'edit'],
        'settings':      ['view', 'edit', 'settings_access'],
        'customers':     _ta_full,
        'suppliers':     _ta_full,
        'payments':      _ta_full,
        'financials':    ['view', 'approve', 'export', 'print', 'financial_access'],
        'auctions':      _ta_full,
        'fish_trading':  _ta_full,
        'crm':           _ta_full,
        'branches':      _ta_full,
        'warehouse':     _ta_full,
        'notifications': _ta_full,
        'audit_logs':    _view,
    },

    # ─────────────────────────────────────────────
    # 3. BRANCH MANAGER – own branch, no finance/users
    # ─────────────────────────────────────────────
    'Branch Manager': {
        'dashboard':     _view,
        'sales':         _vced,
        'purchases':     _vced,
        'inventory':     _vced,
        'accounting':    _view,
        'catalog':       _vce,
        'orders':        _vced,
        'reports':       ['view', 'export', 'print'],
        'users':         [],       # no access
        'settings':      [],
        'customers':     _vce,
        'suppliers':     _vce,
        'payments':      _view,
        'financials':    [],
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           _view,
        'branches':      _view,    # own branch only – enforced by queryset
        'warehouse':     _vce,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 4. FINANCE MANAGER – financial authority
    # ─────────────────────────────────────────────
    'Finance Manager': {
        'dashboard':     _view,
        'sales':         _view,
        'purchases':     _view,
        'inventory':     _view,
        'accounting':    _full,
        'catalog':       _view,
        'orders':        _view,
        'reports':       ['view', 'export', 'print', 'financial_access'],
        'users':         [],
        'settings':      [],
        'customers':     _view,
        'suppliers':     _view,
        'payments':      _full,
        'financials':    _full,
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _view,
        'notifications': _view,
        'audit_logs':    _view,
    },

    # ─────────────────────────────────────────────
    # 5. ACCOUNTANT – daily finance, no delete/approve
    # ─────────────────────────────────────────────
    'Accountant': {
        'dashboard':     _view,
        'sales':         _view,
        'purchases':     _view,
        'inventory':     _view,
        'accounting':    ['view', 'create', 'edit', 'export', 'print', 'financial_access'],
        'catalog':       _view,
        'orders':        _view,
        'reports':       ['view', 'export', 'print'],
        'users':         [],
        'settings':      [],
        'customers':     _view,
        'suppliers':     _view,
        'payments':      ['view', 'create', 'edit', 'export', 'financial_access'],
        'financials':    ['view', 'export', 'financial_access'],
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _view,
        'notifications': _view,
        'audit_logs':    _view,
    },

    # ─────────────────────────────────────────────
    # 6. PURCHASE MANAGER – procurement, limited finance
    # ─────────────────────────────────────────────
    'Purchase Manager': {
        'dashboard':     _view,
        'sales':         _view,
        'purchases':     _full,
        'inventory':     _vce,
        'accounting':    _view,
        'catalog':       _vce,
        'orders':        _vce,
        'reports':       ['view', 'export', 'print'],
        'users':         [],
        'settings':      [],
        'customers':     _view,
        'suppliers':     _vced,
        'payments':      _view,
        'financials':    [],
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _vce,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 7. INVENTORY MANAGER – stock, no accounting/payments
    # ─────────────────────────────────────────────
    'Inventory Manager': {
        'dashboard':     _view,
        'sales':         _view,
        'purchases':     _view,
        'inventory':     _vced,
        'accounting':    [],
        'catalog':       _vce,
        'orders':        _view,
        'reports':       ['view', 'export'],
        'users':         [],
        'settings':      [],
        'customers':     _view,
        'suppliers':     _view,
        'payments':      [],
        'financials':    [],
        'auctions':      _view,
        'fish_trading':  _vce,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _vced,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 8. AUCTION MANAGER – auctions + fish trading
    # ─────────────────────────────────────────────
    'Auction Manager': {
        'dashboard':     _view,
        'sales':         _view,
        'purchases':     _view,
        'inventory':     _view,
        'accounting':    [],
        'catalog':       _view,
        'orders':        _vce,
        'reports':       ['view', 'export', 'print'],
        'users':         [],
        'settings':      [],
        'customers':     _vce,
        'suppliers':     _view,
        'payments':      [],
        'financials':    [],
        'auctions':      _vced,
        'fish_trading':  _vced,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _view,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 9. SALES STAFF – sales, orders, customers
    # ─────────────────────────────────────────────
    'Sales Staff': {
        'dashboard':     _view,
        'sales':         _vce,
        'purchases':     [],
        'inventory':     _view,
        'accounting':    [],
        'catalog':       _view,
        'orders':        _vced,
        'reports':       ['view', 'export'],
        'users':         [],
        'settings':      [],
        'customers':     _vced,
        'suppliers':     [],
        'payments':      _view,
        'financials':    [],
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           _vce,
        'branches':      _view,
        'warehouse':     [],
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 10. TRADER – fish trading + orders
    # ─────────────────────────────────────────────
    'Trader': {
        'dashboard':     _view,
        'sales':         _vce,
        'purchases':     _view,
        'inventory':     _view,
        'accounting':    [],
        'catalog':       _view,
        'orders':        _vced,
        'reports':       ['view', 'export'],
        'users':         [],
        'settings':      [],
        'customers':     _view,
        'suppliers':     _view,
        'payments':      _view,
        'financials':    [],
        'auctions':      _vce,
        'fish_trading':  _vced,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _view,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 11. STORE / INVENTORY STAFF – warehouse ops
    # ─────────────────────────────────────────────
    'Store / Inventory Staff': {
        'dashboard':     _view,
        'sales':         _view,
        'purchases':     _view,
        'inventory':     _vce,
        'accounting':    [],
        'catalog':       _view,
        'orders':        _view,
        'reports':       _view,
        'users':         [],
        'settings':      [],
        'customers':     _view,
        'suppliers':     _view,
        'payments':      [],
        'financials':    [],
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           [],
        'branches':      _view,
        'warehouse':     _vced,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 12. SUPERVISOR – read-only across ops
    # ─────────────────────────────────────────────
    'Supervisor': {
        'dashboard':     _view,
        'sales':         _view,
        'purchases':     _view,
        'inventory':     _view,
        'accounting':    [],
        'catalog':       _view,
        'orders':        _view,
        'reports':       _view,
        'users':         [],
        'settings':      [],
        'customers':     _view,
        'suppliers':     _view,
        'payments':      [],
        'financials':    [],
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _view,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 13. STAFF – basic ops, view + limited create/edit
    # ─────────────────────────────────────────────
    'Staff': {
        'dashboard':     _view,
        'sales':         _vce,
        'purchases':     _vce,
        'inventory':     _vce,
        'accounting':    [],
        'catalog':       _view,
        'orders':        _vce,
        'reports':       _view,
        'users':         [],
        'settings':      [],
        'customers':     _vce,
        'suppliers':     _view,
        'payments':      [],
        'financials':    [],
        'auctions':      _view,
        'fish_trading':  _view,
        'crm':           _view,
        'branches':      _view,
        'warehouse':     _view,
        'notifications': _view,
        'audit_logs':    [],
    },

    # ─────────────────────────────────────────────
    # 14. VIEWER – read-only everywhere
    # ─────────────────────────────────────────────
    'Viewer': {
        module: _view for module in ALL_MODULES
    },
}

ROLE_DESCRIPTIONS = {
    'System Admin':            'Platform super admin – unrestricted access across all tenants.',
    'Tenant Admin':            'Business owner within a tenant – full control except platform settings.',
    'Branch Manager':          'Manages a single branch – sales, purchases, inventory.',
    'Finance Manager':         'Financial authority – full accounting, payments, and financials.',
    'Accountant':              'Daily finance work – view/create/edit accounts and payments.',
    'Purchase Manager':        'Procurement workflow – purchases, suppliers, inventory view/edit.',
    'Inventory Manager':       'Stock management – inventory and warehouse control.',
    'Auction Manager':         'Auction operations – auctions and fish trading.',
    'Sales Staff':             'Customer sales – sales orders and customer management.',
    'Trader':                  'Fish trader – fish trading and order fulfillment.',
    'Store / Inventory Staff': 'Warehouse operations – stock in/out, no financial access.',
    'Supervisor':              'Operational supervision – read-only across sales and ops.',
    'Staff':                   'Basic operations – view and limited create/edit on assigned modules.',
    'Viewer':                  'Read-only access – cannot create, edit, or delete anything.',
}


def create_default_roles_and_permissions(apps, schema_editor):
    Permission = apps.get_model('permissions', 'Permission')
    Role = apps.get_model('permissions', 'Role')
    RolePermission = apps.get_model('permissions', 'RolePermission')

    # Build a lookup dict: (module, action) → Permission instance
    perm_map = {
        (p.module, p.action): p
        for p in Permission.objects.all()
    }

    for role_name, module_defs in ROLE_MATRIX.items():
        # Create or fetch the role
        role, _ = Role.objects.get_or_create(
            name=role_name,
            defaults={
                'description': ROLE_DESCRIPTIONS.get(role_name, f'{role_name} role'),
                'is_system_admin': (role_name == 'System Admin'),
            }
        )
        # Update description and flag in case the role already existed
        role.description = ROLE_DESCRIPTIONS.get(role_name, role.description)
        role.is_system_admin = (role_name == 'System Admin')
        role.save(update_fields=['description', 'is_system_admin'])

        # Wipe existing role-permission assignments (idempotent)
        RolePermission.objects.filter(role=role).delete()

        # Grant permissions
        if module_defs == '__all__':
            # System Admin: grant every permission
            bulk = [
                RolePermission(role=role, permission=perm, allowed=True)
                for perm in perm_map.values()
            ]
        else:
            bulk = []
            for module, allowed_actions in module_defs.items():
                for action in allowed_actions:
                    perm = perm_map.get((module, action))
                    if perm:
                        bulk.append(
                            RolePermission(role=role, permission=perm, allowed=True)
                        )

        if bulk:
            RolePermission.objects.bulk_create(bulk, ignore_conflicts=True)


def remove_default_roles(apps, schema_editor):
    """Reverse: remove all roles and their permissions."""
    Role = apps.get_model('permissions', 'Role')
    # RolePermission cascades on delete
    Role.objects.filter(name__in=list(ROLE_MATRIX.keys())).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('permissions', '0002_initial_data'),
    ]
    operations = [
        migrations.RunPython(
            create_default_roles_and_permissions,
            reverse_code=remove_default_roles,
        ),
    ]
