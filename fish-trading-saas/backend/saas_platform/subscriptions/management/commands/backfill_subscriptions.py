from django.core.management.base import BaseCommand
from django.utils import timezone
from saas_platform.subscriptions.models import Subscription, SubscriptionTier
from saas_platform.companies.models import Company

class Command(BaseCommand):
    help = 'Backfills subscription IDs and ensures every active company has a subscription.'

    def handle(self, *args, **options):
        self.stdout.write("Starting subscription backfill...")
        
        # Get fallback tier (or create one)
        try:
            free_tier = SubscriptionTier.objects.get(name='free')
        except SubscriptionTier.DoesNotExist:
            try:
                free_tier = SubscriptionTier.objects.get(name='basic')
            except SubscriptionTier.DoesNotExist:
                free_tier = SubscriptionTier.objects.first()
                if not free_tier:
                    free_tier = SubscriptionTier.objects.create(name='free')
        
        # Ensure every company has at least one subscription
        companies = Company.objects.all()
        for company in companies:
            subs = company.subscriptions.all()
            if not subs.exists():
                Subscription.objects.create(
                    company=company,
                    tier=free_tier,
                    status='active'
                )
        
        # Now backfill subscription IDs for all subscriptions
        subscriptions = Subscription.objects.all()
        updated_count = 0
        for sub in subscriptions:
            if not sub.subscription_id:
                year = sub.created_at.year if sub.created_at else timezone.now().year
                sub.subscription_id = f"SUB-FP-{year}-{sub.id:06d}"
                
                # Also set safe defaults for billing fields if they are missing
                sub.price = sub.tier.price_monthly if sub.tier else 0
                sub.currency = "USD"
                sub.is_trial = (sub.status == 'trial')
                
                sub.save(update_fields=['subscription_id', 'price', 'currency', 'is_trial'])
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully backfilled {updated_count} subscriptions.'))
