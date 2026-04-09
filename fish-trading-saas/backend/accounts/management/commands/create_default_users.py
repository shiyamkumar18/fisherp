from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from datetime import timedelta
from subscriptions.models import SubscriptionTier, Subscription
from companies.models import Company

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
        # NOT a superuser - can manage SaaS but cannot see business data directly
        platform_operator, created = self._sync_demo_user(
            username='platform_operator',
            email='platform.operator@fishapp.com',
            password='platform123',
            role='platform_operator',
            company=None,
            is_superuser=False,
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Platform Operator created: platform_operator / platform123'))
        else:
            self.stdout.write(self.style.SUCCESS('Platform Operator synced: platform_operator / platform123'))
        self.stdout.write(self.style.WARNING('  ⚠️ NOT a superuser - must use impersonation to access tenant data'))

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
        if created:
            self.stdout.write(self.style.SUCCESS('Platform Support created: platform_support / support123'))
        else:
            self.stdout.write(self.style.SUCCESS('Platform Support synced: platform_support / support123'))

        # =====================
        # TENANT ADMIN
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
        if created:
            self.stdout.write(self.style.SUCCESS('Tenant Admin created: admin / admin123'))
        else:
            self.stdout.write(self.style.SUCCESS('Tenant Admin synced: admin / admin123'))

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
        if created:
            self.stdout.write(self.style.SUCCESS('Accountant created: accountant / accountant123'))
        else:
            self.stdout.write(self.style.SUCCESS('Accountant synced: accountant / accountant123'))

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
        if created:
            self.stdout.write(self.style.SUCCESS('Trader created: trader / trader123'))
        else:
            self.stdout.write(self.style.SUCCESS('Trader synced: trader / trader123'))

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
        if created:
            self.stdout.write(self.style.SUCCESS('Store created: store / store123'))
        else:
            self.stdout.write(self.style.SUCCESS('Store synced: store / store123'))

        # =====================
        # SECOND TENANT (for testing isolation)
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
        if created:
            self.stdout.write(self.style.SUCCESS('Tenant 2 Admin created: tenant2_admin / tenant2123'))
        else:
            self.stdout.write(self.style.SUCCESS('Tenant 2 Admin synced: tenant2_admin / tenant2123'))

        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('DEFAULT USERS CREATED SUCCESSFULLY'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('\n📋 CREDENTIALS:\n')
        self.stdout.write('  🔧 Platform Operator: platform_operator / platform123')
        self.stdout.write('     → Role: platform_operator')
        self.stdout.write('     → Can manage tenants/subscriptions')
        self.stdout.write('     → ⚠️ Cannot see business data directly\n')
        self.stdout.write('  🛟 Platform Support: platform_support / support123')
        self.stdout.write('     → Role: platform_support')
        self.stdout.write('     → Can troubleshoot tenant issues with limited rights\n')

        self.stdout.write('  👑 Tenant Admin: admin / admin123')
        self.stdout.write('     → Role: tenant_admin')
        self.stdout.write('     → Full access within tenant\n')

        self.stdout.write('  💰 Accountant: accountant / accountant123')
        self.stdout.write('     → Role: accountant')
        self.stdout.write('     → Financial authority\n')

        self.stdout.write('  📈 Trader: trader / trader123')
        self.stdout.write('     → Role: trader')
        self.stdout.write('     → Sales operations only\n')

        self.stdout.write('  📦 Store: store / store123')
        self.stdout.write('     → Role: store')
        self.stdout.write('     → Purchase & inventory only\n')

        self.stdout.write('  👑 Tenant 2: tenant2_admin / tenant2123')
        self.stdout.write('     → Second tenant for isolation testing\n')

        self.stdout.write('\n🔒 SECURITY NOTES:')
        self.stdout.write('  - Platform Operator is NOT a superuser')
        self.stdout.write('  - Must use impersonation to access tenant data')
        self.stdout.write('  - All impersonation actions are logged')
        self.stdout.write('  - Tenant data is fully isolated')
        self.stdout.write(self.style.WARNING('\n  ⚠️  DEV CREDENTIALS ONLY – rotate all passwords before any real use'))
