from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from subscriptions.models import SubscriptionTier, Subscription

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates default tenant, trader, and admin users'

    def handle(self, *args, **options):
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
        
        # Create Admin User (superuser with full access)
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_superuser(
                username='admin',
                email='admin@fishapp.com',
                password='admin123',
                schema_name='public'
            )
            self.stdout.write(self.style.SUCCESS(f'Admin user created: admin / admin123'))
        else:
            self.stdout.write(self.style.WARNING('Admin user already exists'))

        # Create Trader User (regular user for trading operations)
        if not User.objects.filter(username='trader').exists():
            trader_user = User.objects.create_user(
                username='trader',
                email='trader@fishapp.com',
                password='trader123',
                schema_name='trader'
            )
            # Create subscription for trader
            Subscription.objects.create(
                tenant=trader_user,
                tier=tier,
                status='active',
                start_date=timezone.now(),
                expiry_date=timezone.now() + timedelta(days=30)
            )
            self.stdout.write(self.style.SUCCESS(f'Trader user created: trader / trader123'))
        else:
            trader_user = User.objects.filter(username='trader').first()
            # Create subscription if not exists
            if not Subscription.objects.filter(tenant=trader_user).exists():
                Subscription.objects.create(
                    tenant=trader_user,
                    tier=tier,
                    status='active',
                    start_date=timezone.now(),
                    expiry_date=timezone.now() + timedelta(days=30)
                )
            self.stdout.write(self.style.WARNING('Trader user already exists'))

        # Create Tenant User
        if not User.objects.filter(username='tenant').exists():
            tenant_user = User.objects.create_user(
                username='tenant',
                email='tenant@fishapp.com',
                password='tenant123',
                schema_name='tenant'
            )
            # Create subscription for tenant
            Subscription.objects.create(
                tenant=tenant_user,
                tier=tier,
                status='active',
                start_date=timezone.now(),
                expiry_date=timezone.now() + timedelta(days=30)
            )
            self.stdout.write(self.style.SUCCESS(f'Tenant user created: tenant / tenant123'))
        else:
            tenant_user = User.objects.filter(username='tenant').first()
            if not Subscription.objects.filter(tenant=tenant_user).exists():
                Subscription.objects.create(
                    tenant=tenant_user,
                    tier=tier,
                    status='active',
                    start_date=timezone.now(),
                    expiry_date=timezone.now() + timedelta(days=30)
                )
            self.stdout.write(self.style.WARNING('Tenant user already exists'))

        # Create Demo Tenant User
        if not User.objects.filter(username='demo').exists():
            demo_user = User.objects.create_user(
                username='demo',
                email='demo@fishapp.com',
                password='demo123',
                schema_name='demo'
            )
            # Create subscription for demo
            Subscription.objects.create(
                tenant=demo_user,
                tier=tier,
                status='active',
                start_date=timezone.now(),
                expiry_date=timezone.now() + timedelta(days=30)
            )
            self.stdout.write(self.style.SUCCESS(f'Demo user created: demo / demo123'))
        else:
            demo_user = User.objects.filter(username='demo').first()
            if not Subscription.objects.filter(tenant=demo_user).exists():
                Subscription.objects.create(
                    tenant=demo_user,
                    tier=tier,
                    status='active',
                    start_date=timezone.now(),
                    expiry_date=timezone.now() + timedelta(days=30)
                )
            self.stdout.write(self.style.WARNING('Demo user already exists'))

        self.stdout.write(self.style.SUCCESS('\nDefault users and subscriptions created successfully!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  Admin:  admin / admin123')
        self.stdout.write('  Trader: trader / trader123')
        self.stdout.write('  Tenant: tenant / tenant123')
        self.stdout.write('  Demo:   demo / demo123')

