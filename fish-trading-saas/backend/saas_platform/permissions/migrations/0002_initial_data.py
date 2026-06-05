from django.db import migrations

def create_initial_data(apps, schema_editor):
    Permission = apps.get_model('permissions', 'Permission')
    Role = apps.get_model('permissions', 'Role')
    RolePermission = apps.get_model('permissions', 'RolePermission')
    # Define modules and actions (a subset for demo)
    modules = [
        'dashboard', 'sales', 'purchases', 'inventory', 'accounting',
        'catalog', 'orders', 'reports', 'users', 'settings', 'customers',
        'suppliers', 'payments', 'financials', 'auctions', 'fish_trading',
        'crm', 'branches', 'warehouse', 'notifications', 'audit_logs'
    ]
    actions = [
        'view', 'create', 'edit', 'delete', 'approve', 'export', 'print',
        'financial_access', 'settings_access', 'admin_override'
    ]
    # Create Permission objects
    for module in modules:
        for action in actions:
            Permission.objects.create(module=module, action=action)
    # Create System Admin role with all permissions allowed
    system_admin = Role.objects.create(name='System Admin', description='Platform super admin', is_system_admin=True)
    for perm in Permission.objects.all():
        RolePermission.objects.create(role=system_admin, permission=perm, allowed=True)
    # Create Tenant Admin with all permissions except admin_override
    tenant_admin = Role.objects.create(name='Tenant Admin', description='Full tenant access')
    for perm in Permission.objects.all():
        allowed = perm.action != 'admin_override'
        RolePermission.objects.create(role=tenant_admin, permission=perm, allowed=allowed)
    # Add other roles with minimal permissions (example for Accountant)
    accountant = Role.objects.create(name='Accountant', description='Daily finance work')
    # Grant view/create/edit on accounting and payments, view on others
    for perm in Permission.objects.filter(module__in=['accounting', 'payments']):
        if perm.action in ['view', 'create', 'edit']:
            RolePermission.objects.create(role=accountant, permission=perm, allowed=True)
    for perm in Permission.objects.exclude(module__in=['accounting', 'payments']):
        if perm.action == 'view':
            RolePermission.objects.create(role=accountant, permission=perm, allowed=True)


def remove_initial_data(apps, schema_editor):
    # Delete all created objects
    Role = apps.get_model('permissions', 'Role')
    Role.objects.all().delete()
    Permission = apps.get_model('permissions', 'Permission')
    Permission.objects.all().delete()
    # RolePermission will cascade

class Migration(migrations.Migration):
    dependencies = [
        ('permissions', '0001_initial'),
    ]
    operations = [
        migrations.RunPython(create_initial_data, reverse_code=remove_initial_data),
    ]
