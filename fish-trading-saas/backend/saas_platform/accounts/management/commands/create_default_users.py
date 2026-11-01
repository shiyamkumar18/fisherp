from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from datetime import timedelta
from saas_platform.subscriptions.models import SubscriptionTier, Subscription
from saas_platform.companies.models import Company

User = get_user_model()

# Role to Group mapping
ROLE_GROUP_MAP = {
    'platform_operator': 'platform_operator',
    'platform_support': 'platform_support',
    'tenant_admin': 'tenant_admin',
    'accountant': 'accountant',
    'trader': 'trader',
    'store': 'store',
    # Legacy compatibility
    'sales_staff': 'trader',
    'store_accounts': 'store',
}

def assign_user_to_group(user):
    """Assign a user to their role-based group"""
    group_name = ROLE_GROUP_MAP.get(user.role)
    if group_name:
        try:
            group = Group.objects.get(name=group_name)
            user.groups.add(group)
            return True
        except Group.DoesNotExist:
            return False
    return False


class Command(BaseCommand):
    help = 'Creates default users with proper RBAC roles (LOCAL / DEV ONLY)'

    def get_or_create_company(self, name, slug):
        company, _ = Company.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'is_active': True,
                'is_verified': True,
            }
        )
        return company

    def _assign_group(self, user):
        """Assign user to their role-based group and log it."""
        if assign_user_to_group(user):
            group_name = ROLE_GROUP_MAP.get(user.role, user.role)
            self.stdout.write(self.style.SUCCESS(f'   -> Assigned to {group_name} group'))

    def _sync_demo_user(self, *, username, email, password, role, company=None, is_superuser=False):
        """Create or repair a demo user so reruns always produce the same credentials and role."""
        user = User.objects.filter(username=username).first()
        created = user is None

        if created:
            user = User(username=username)

        user.email = email
        user.role = role
        user.company = company
        user.is_superuser = is_superuser
        user.is_active = True
        user.set_password(password)
        user.save()
        user.groups.clear()
        self._assign_group(user)
        return user, created

    def _sync_subscription(self, *, user, tier, company=None):
        Subscription.objects.update_or_create(
            tenant=user,
            defaults={
                'company': company,
                'tier': tier,
                'status': 'active',
                'start_date': timezone.now(),
                'expiry_date': timezone.now() + timedelta(days=30),
            }
        )

    def handle(self, *args, **options):
        # =================================================================
        # PRODUCTION GUARD – this command must never run against a live DB.
        # =================================================================
        from django.conf import settings
        if not settings.DEBUG:
            raise CommandError(
                "\n\n"
                "  ╔══════════════════════════════════════════════════════╗\n"
                "  ║  BLOCKED: create_default_users is a DEV-ONLY command ║\n"
                "  ║                                                      ║\n"
                "  ║  DEBUG=False detected — this is a production         ║\n"
                "  ║  environment. Running this command would seed weak,  ║\n"
                "  ║  well-known credentials into your live database.     ║\n"
                "  ║                                                      ║\n"
                "  ║  To create production users, use:                   ║\n"
                "  ║    manage.py createsuperuser                         ║\n"
                "  ╚══════════════════════════════════════════════════════╝\n"
            )

        # Create or get subscription tiers
        tier, _ = SubscriptionTier.objects.get_or_create(
            name='free',
            defaults={
                'description': 'Free trial tier',
                'max_users': 1,
                'max_storage_gb': 5,
                'price_monthly': 0,
                'allow_api_access': True,
                'allow_analytics': True,
                'trial_days': 30,
                'is_active': True,
            }
        )

        # Ensure tenant companies exist for tenant-side users.
        tenant1 = self.get_or_create_company('Tenant 1 Company', 'tenant1')
        tenant2 = self.get_or_create_company('Tenant 2 Company', 'tenant2')

        # =====================
        # PLATFORM OPERATOR
        # =====================
        platform_operator, created = self._sync_demo_user(
            username='platform_operator',
            email='platform.operator@fishapp.com',
            password='platform123',
            role='platform_operator',
            company=None,
            is_superuser=False,
        )
        self.stdout.write(self.style.SUCCESS(f'Platform Operator {"created" if created else "synced"}: platform_operator / platform123'))

        # =====================
        # PLATFORM SUPPORT
        # =====================
        _, created = self._sync_demo_user(
            username='platform_support',
            email='support@fishapp.com',
            password='support123',
            role='platform_support',
            company=None,
            is_superuser=False,
        )
        self.stdout.write(self.style.SUCCESS(f'Platform Support {"created" if created else "synced"}: platform_support / support123'))

        # =====================
        # TENANT ADMIN (Tenant 1)
        # =====================
        admin_user, created = self._sync_demo_user(
            username='admin',
            email='admin@fishapp.com',
            password='admin123',
            role='tenant_admin',
            company=tenant1,
            is_superuser=False,
        )
        tenant1.admin = admin_user
        tenant1.save(update_fields=['admin'])
        self._sync_subscription(user=admin_user, tier=tier, company=tenant1)
        self.stdout.write(self.style.SUCCESS(f'Tenant Admin {"created" if created else "synced"}: admin / admin123'))

        # =====================
        # ACCOUNTANT
        # =====================
        _, created = self._sync_demo_user(
            username='accountant',
            email='accountant@fishapp.com',
            password='accountant123',
            role='accountant',
            company=tenant1,
            is_superuser=False,
        )
        self._sync_subscription(user=User.objects.get(username='accountant'), tier=tier, company=tenant1)
        self.stdout.write(self.style.SUCCESS(f'Accountant {"created" if created else "synced"}: accountant / accountant123'))

        # =====================
        # TRADER
        # =====================
        _, created = self._sync_demo_user(
            username='trader',
            email='trader@fishapp.com',
            password='trader123',
            role='trader',
            company=tenant1,
            is_superuser=False,
        )
        self._sync_subscription(user=User.objects.get(username='trader'), tier=tier, company=tenant1)
        self.stdout.write(self.style.SUCCESS(f'Trader {"created" if created else "synced"}: trader / trader123'))

        # =====================
        # STORE
        # =====================
        _, created = self._sync_demo_user(
            username='store',
            email='store@fishapp.com',
            password='store123',
            role='store',
            company=tenant1,
            is_superuser=False,
        )
        self._sync_subscription(user=User.objects.get(username='store'), tier=tier, company=tenant1)
        self.stdout.write(self.style.SUCCESS(f'Store {"created" if created else "synced"}: store / store123'))

        # =====================
        # TENANT 2 ADMIN (isolation testing)
        # =====================
        tenant2_admin, created = self._sync_demo_user(
            username='tenant2_admin',
            email='tenant2@fishapp.com',
            password='tenant2123',
            role='tenant_admin',
            company=tenant2,
            is_superuser=False,
        )
        tenant2.admin = tenant2_admin
        tenant2.save(update_fields=['admin'])
        self._sync_subscription(user=tenant2_admin, tier=tier, company=tenant2)
        self.stdout.write(self.style.SUCCESS(f'Tenant 2 Admin {"created" if created else "synced"}: tenant2_admin / tenant2123'))

        # =============================================
        # ALL REMAINING PLATFORM ROLES
        # =============================================

        platform_users = [
            ('platform_devops',      'devops@fishapp.com',        'devops123',       'platform_devops'),
            ('platform_finance',     'pfin@fishapp.com',          'pfin123',         'platform_finance'),
            ('platform_billing',     'billing@fishapp.com',       'billing123',      'platform_billing'),
            ('platform_support_mgr', 'supportmgr@fishapp.com',    'supportmgr123',   'platform_support_manager'),
            ('platform_cs',          'cs@fishapp.com',            'cs123',           'platform_customer_success'),
            ('platform_sales_mgr',   'salesmgr@fishapp.com',      'salesmgr123',     'platform_sales_manager'),
            ('platform_onboarding',  'onboarding@fishapp.com',    'onboarding123',   'platform_onboarding'),
            ('platform_support_l2',  'supportl2@fishapp.com',     'supportl2123',    'platform_support_l2'),
            ('platform_support_l1',  'supportl1@fishapp.com',     'supportl1123',    'platform_support_l1'),
        ]

        for username, email, password, role in platform_users:
            _, created = self._sync_demo_user(
                username=username, email=email, password=password,
                role=role, company=None, is_superuser=False,
            )
            self.stdout.write(self.style.SUCCESS(f'{role} {"created" if created else "synced"}: {username} / {password}'))

        # =============================================
        # ALL REMAINING TENANT ROLES (company=tenant1)
        # =============================================

        tenant_users = [
            ('finance_mgr',   'financemgr@fishapp.com',  'financemgr123',  'finance_manager'),
            ('purchase_mgr',  'purchase@fishapp.com',    'purchase123',    'purchase_manager'),
            ('sales_staff',   'sales@fishapp.com',       'sales123',       'sales_staff'),
            ('inv_manager',   'inventory@fishapp.com',   'inventory123',   'inventory_manager'),
            ('auction_mgr',   'auction@fishapp.com',     'auction123',     'auction_manager'),
            ('branch_mgr',    'branch@fishapp.com',      'branch123',      'branch_manager'),
            ('supervisor',    'supervisor@fishapp.com',  'supervisor123',  'supervisor'),
            ('staff',         'staff@fishapp.com',       'staff123',       'staff'),
            ('viewer',        'viewer@fishapp.com',      'viewer123',      'viewer'),
        ]

        for username, email, password, role in tenant_users:
            _, created = self._sync_demo_user(
                username=username, email=email, password=password,
                role=role, company=tenant1, is_superuser=False,
            )
            self._sync_subscription(user=User.objects.get(username=username), tier=tier, company=tenant1)
            self.stdout.write(self.style.SUCCESS(f'{role} {"created" if created else "synced"}: {username} / {password}'))

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('ALL USERS CREATED / SYNCED SUCCESSFULLY'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('     → Role: platform_operator')
        self.stdout.write('     → Can manage tenants/subscriptions')
        self.stdout.write('     → ⚠️ Cannot see business data directly\n')
        self.stdout.write('\n📋 See DEV_CREDENTIALS.md in the project root for the full credential list.\n')
        self.stdout.write('\n🔒 SECURITY NOTES:')
        self.stdout.write('  - Platform Operator is NOT a superuser')
        self.stdout.write('  - Must use impersonation to access tenant data')
        self.stdout.write('  - All impersonation actions are logged')
        self.stdout.write('  - Tenant data is fully isolated')
        self.stdout.write(self.style.WARNING('\n  ⚠️  DEV CREDENTIALS ONLY – rotate all passwords before any real use'))

