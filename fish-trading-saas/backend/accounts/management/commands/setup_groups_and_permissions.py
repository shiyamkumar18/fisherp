"""
Management Command: setup_groups_and_permissions

This command creates Django Groups for each role and assigns appropriate permissions.

Usage:
    python manage.py setup_groups_and_permissions

Groups Created:
    1. platform_operator - SaaS platform management
    2. platform_support - Cross-tenant support with limited rights
    3. tenant_admin - Full tenant business control
    4. accountant - Financial authority
    5. trader - Sales operations
    6. store - Purchase & Inventory

Permissions:
    - Platform Operator: Can manage tenants, subscriptions, view platform analytics
    - Tenant Admin: Full access to all tenant business data
    - Accountant: View/change financial data, add payments
    - Trader: Create sales, view inventory
    - Store: Create purchases, update stock
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.apps import apps


class Command(BaseCommand):
    help = 'Create Django Groups and assign permissions for RBAC'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write('SETTING UP RBAC GROUPS AND PERMISSIONS')
        self.stdout.write('=' * 60 + '\n')

        # Create groups
        self.create_groups()

        # Assign permissions to groups
        self.assign_permissions()

        # Summary
        self.print_summary()

    def create_groups(self):
        """Create Django Groups for each role"""
        self.stdout.write(self.style.HTTP_INFO('\nCreating Groups...'))

        self.groups = {
            'platform_operator': Group.objects.get_or_create(name='platform_operator')[0],
            'platform_support': Group.objects.get_or_create(name='platform_support')[0],
            'tenant_admin': Group.objects.get_or_create(name='tenant_admin')[0],
            'accountant': Group.objects.get_or_create(name='accountant')[0],
            'trader': Group.objects.get_or_create(name='trader')[0],
            'store': Group.objects.get_or_create(name='store')[0],
        }

        for group_name, group in self.groups.items():
            self.stdout.write(self.style.SUCCESS(f'   Created: {group_name}'))

    def assign_permissions(self):
        """Assign model permissions to groups"""
        self.stdout.write(self.style.HTTP_INFO('\nAssigning Permissions...'))

        # Get all permissions
        all_permissions = self.get_all_permissions()

        # Platform Operator Permissions
        self.stdout.write('\n   Platform Operator:')
        self.assign_group_permissions('platform_operator', all_permissions['platform_operator'])

        # Platform Support Permissions
        self.stdout.write('\n   Platform Support:')
        self.assign_group_permissions('platform_support', all_permissions['platform_support'])

        # Tenant Admin Permissions
        self.stdout.write('\n   Tenant Admin:')
        self.assign_group_permissions('tenant_admin', all_permissions['tenant_admin'])

        # Accountant Permissions
        self.stdout.write('\n   Accountant:')
        self.assign_group_permissions('accountant', all_permissions['accountant'])

        # Trader Permissions
        self.stdout.write('\n   Trader:')
        self.assign_group_permissions('trader', all_permissions['trader'])

        # Store Permissions
        self.stdout.write('\n   Store:')
        self.assign_group_permissions('store', all_permissions['store'])

        # Create custom permissions
        self.create_custom_permissions()

    def get_all_permissions(self):  # noqa: C901
        """Get all available permissions organized by role"""
        
        # Get content types
        permissions = {
            'platform_operator': [],
            'platform_support': [],
            'tenant_admin': [],
            'accountant': [],
            'trader': [],
            'store': [],
        }

        try:
            # Company/Domain permissions for platform operators
            company_ct = ContentType.objects.get_for_model(apps.get_model('companies', 'Company'))
            domain_ct = ContentType.objects.get_for_model(apps.get_model('companies', 'Domain'))
            
            # Platform operator can manage companies and domains
            for perm in ['add', 'change', 'delete', 'view']:
                permissions['platform_operator'].append(
                    f"{perm}_{company_ct.model}"
                )
                permissions['platform_operator'].append(
                    f"{perm}_{domain_ct.model}"
                )
            # Support gets read-only company/domain visibility.
            for perm in ['view']:
                permissions['platform_support'].append(f"{perm}_{company_ct.model}")
                permissions['platform_support'].append(f"{perm}_{domain_ct.model}")
            
            # Subscription permissions for platform operators
            subscription_ct = ContentType.objects.get_for_model(apps.get_model('subscriptions', 'Subscription'))
            tier_ct = ContentType.objects.get_for_model(apps.get_model('subscriptions', 'SubscriptionTier'))
            
            for perm in ['add', 'change', 'delete', 'view']:
                permissions['platform_operator'].append(
                    f"{perm}_{subscription_ct.model}"
                )
                permissions['platform_operator'].append(
                    f"{perm}_{tier_ct.model}"
                )
            # Support gets read-only subscription visibility.
            for perm in ['view']:
                permissions['platform_support'].append(f"{perm}_{subscription_ct.model}")
                permissions['platform_support'].append(f"{perm}_{tier_ct.model}")

            # User permissions - platform operators can manage users
            user_ct = ContentType.objects.get_for_model(apps.get_model('accounts', 'User'))
            for perm in ['add', 'change', 'delete', 'view']:
                permissions['platform_operator'].append(f"{perm}_{user_ct.model}")
            # Support can view users only.
            permissions['platform_support'].append(f"view_{user_ct.model}")

            # Trading model permissions
            trading_models = ['FishCategory', 'Fish', 'Supplier', 'Buyer', 'PurchaseBatch', 'Sale', 'Payment', 'Inventory']
            
            for model_name in trading_models:
                try:
                    ct = ContentType.objects.get_for_model(apps.get_model('trading', model_name))
                    
                    # Tenant Admin gets full access
                    for perm in ['add', 'change', 'delete', 'view']:
                        permissions['tenant_admin'].append(f"{perm}_{ct.model}")
                    
                    # Accountant gets view access to all, change to financial
                    for perm in ['view']:
                        permissions['accountant'].append(f"{perm}_{ct.model}")
                    
                    # Sales and Payment are changeable by accountant
                    if model_name in ['Sale', 'Payment']:
                        permissions['accountant'].append(f"add_{ct.model}")
                        permissions['accountant'].append(f"change_{ct.model}")
                    
                    # Trader gets sales-related permissions
                    if model_name in ['Sale', 'Buyer']:
                        for perm in ['add', 'change', 'view']:
                            permissions['trader'].append(f"{perm}_{ct.model}")
                    
                    # Trader can view inventory
                    if model_name == 'Inventory':
                        permissions['trader'].append(f"view_{ct.model}")
                    
                    # Store gets purchase-related permissions
                    if model_name in ['PurchaseBatch', 'Supplier', 'Inventory', 'Payment']:
                        for perm in ['add', 'change', 'view']:
                            permissions['store'].append(f"{perm}_{ct.model}")
                    
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'   Could not get permissions for {model_name}: {e}'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   Error getting permissions: {e}'))

        return permissions

    def assign_group_permissions(self, group_name, permission_codenames):
        """Assign permissions to a group"""
        group = self.groups[group_name]
        
        for codename in permission_codenames:
            try:
                perm = Permission.objects.get(codename=codename)
                group.permissions.add(perm)
                self.stdout.write(f'      + {codename}')
            except Permission.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'      Not found: {codename}'))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'      Error: {codename} - {e}'))

    def create_custom_permissions(self):
        """Create custom permissions for fine-grained access control"""
        self.stdout.write(self.style.HTTP_INFO('\nCreating Custom Permissions...'))

        custom_perms = [
            # Platform management
            {'name': 'Can manage tenants', 'codename': 'can_manage_tenants', 'model': 'companies.Company', 'description': 'Can create, edit, and suspend tenant companies'},
            {'name': 'Can manage subscriptions', 'codename': 'can_manage_subscriptions', 'model': 'subscriptions.Subscription', 'description': 'Can manage subscription tiers and plans'},
            {'name': 'Can view platform reports', 'codename': 'can_view_platform_reports', 'model': 'accounts.User', 'description': 'Can view platform-wide analytics'},
            
            # Tenant management
            {'name': 'Can manage tenant users', 'codename': 'can_manage_users', 'model': 'accounts.User', 'description': 'Can add, edit, and remove tenant users'},
            {'name': 'Can view financial reports', 'codename': 'can_view_reports', 'model': 'trading.Sale', 'description': 'Can view financial reports and analytics'},
            {'name': 'Can export data', 'codename': 'can_export_data', 'model': 'trading.Sale', 'description': 'Can export data to CSV/PDF'},
            
            # Inventory management
            {'name': 'Can manage inventory', 'codename': 'can_manage_inventory', 'model': 'trading.Inventory', 'description': 'Can update stock levels and manage inventory'},
            {'name': 'Can manage fish storage', 'codename': 'can_manage_storage', 'model': 'trading.Inventory', 'description': 'Can manage fish storage and temperature'},
            
            # Trade management
            {'name': 'Can manage trades', 'codename': 'can_manage_trades', 'model': 'trading.Sale', 'description': 'Can create and manage purchases and sales'},
            {'name': 'Can view supplier costs', 'codename': 'can_view_supplier_costs', 'model': 'trading.Supplier', 'description': 'Can view supplier cost details'},
            {'name': 'Can view profit margins', 'codename': 'can_view_profit', 'model': 'trading.Sale', 'description': 'Can view profit margins and calculations'},
        ]

        for perm_data in custom_perms:
            try:
                # Get the model class using app_label.model_name
                model = apps.get_model(perm_data['model'])
                ct = ContentType.objects.get_for_model(model)
                
                perm, created = Permission.objects.get_or_create(
                    codename=perm_data['codename'],
                    content_type=ct,
                    defaults={
                        'name': perm_data['name'],
                    }
                )
                
                if created:
                    self.stdout.write(self.style.SUCCESS(f'   Created: {perm_data["codename"]}'))
                else:
                    self.stdout.write(f'   Already exists: {perm_data["codename"]}')
                
                # Assign to appropriate groups
                self.assign_custom_permission(perm, perm_data['codename'])
                
            except LookupError:
                self.stdout.write(self.style.WARNING(f'   Model not found for {perm_data["codename"]}: {perm_data["model"]}'))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'   Error creating {perm_data["codename"]}: {e}'))

    def assign_custom_permission(self, permission, codename):
        """Assign custom permission to appropriate groups"""
        
        # Tenant management permissions to tenant_admin
        if codename in ['can_manage_users', 'can_view_reports', 'can_export_data', 'can_manage_inventory', 'can_manage_storage', 'can_manage_trades', 'can_view_supplier_costs', 'can_view_profit']:
            self.groups['tenant_admin'].permissions.add(permission)
        
        # Financial permissions to accountant
        if codename in ['can_view_reports', 'can_export_data', 'can_view_profit']:
            self.groups['accountant'].permissions.add(permission)
        
        # Trading permissions to trader
        if codename in ['can_manage_trades']:
            self.groups['trader'].permissions.add(permission)
        
        # Inventory permissions to store
        if codename in ['can_manage_inventory', 'can_manage_storage', 'can_manage_trades']:
            self.groups['store'].permissions.add(permission)
        
        # Platform permissions
        if codename in ['can_manage_tenants', 'can_manage_subscriptions', 'can_view_platform_reports']:
            self.groups['platform_operator'].permissions.add(permission)
        if codename in ['can_view_platform_reports']:
            self.groups['platform_support'].permissions.add(permission)

    def print_summary(self):
        """Print summary of created groups and permissions"""
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('RBAC GROUPS SETUP COMPLETE'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        self.stdout.write('\nGroup Summary:\n')
        
        for group_name, group in self.groups.items():
            user_count = group.user_set.count()
            perm_count = group.permissions.count()
            self.stdout.write(f'   {group_name}:')
            self.stdout.write(f'      Users: {user_count}')
            self.stdout.write(f'      Permissions: {perm_count}')
        
        self.stdout.write('\nNext Steps:')
        self.stdout.write('   1. Run: python manage.py create_default_users')
        self.stdout.write('   2. Users will be automatically assigned to groups')
        self.stdout.write('   3. Or assign users manually in Django Admin')
        self.stdout.write('\n' + '=' * 60 + '\n')
