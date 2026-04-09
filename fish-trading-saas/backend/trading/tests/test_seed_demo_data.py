from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from accounts.models import User
from companies.models import Company
from subscriptions.models import Subscription
from trading.models import Buyer, Fish, Inventory, Payment, PurchaseBatch, Sale, Supplier


class SeedDemoDataCommandTests(TestCase):
    @override_settings(DEBUG=False)
    def test_seed_demo_data_is_blocked_outside_debug(self):
        with self.assertRaisesMessage(CommandError, "seed_demo_data is blocked when DEBUG=False."):
            call_command("seed_demo_data")

    @override_settings(DEBUG=True)
    def test_seed_demo_data_creates_end_to_end_records(self):
        call_command("seed_demo_data", reset=True)

        tenant_one = Company.objects.get(slug="tenant1")
        tenant_two = Company.objects.get(slug="tenant2")
        tenant_admin = User.objects.get(username="admin")
        tenant_two_admin = User.objects.get(username="tenant2_admin")

        self.assertTrue(Subscription.objects.filter(company=tenant_one, status="active").exists())
        self.assertTrue(Subscription.objects.filter(company=tenant_two, status="active").exists())
        self.assertEqual(tenant_admin.role, "tenant_admin")
        self.assertFalse(tenant_admin.is_superuser)
        self.assertEqual(tenant_admin.company_id, tenant_one.id)
        self.assertEqual(tenant_two_admin.role, "tenant_admin")
        self.assertEqual(tenant_two_admin.company_id, tenant_two.id)

        self.assertGreater(Fish.objects.filter(company=tenant_one).count(), 0)
        self.assertGreater(Supplier.objects.filter(company=tenant_one).count(), 0)
        self.assertGreater(Buyer.objects.filter(company=tenant_one).count(), 0)
        self.assertGreater(PurchaseBatch.objects.filter(company=tenant_one).count(), 0)
        self.assertGreater(Sale.objects.filter(company=tenant_one).count(), 0)
        self.assertGreater(Payment.objects.filter(company=tenant_one).count(), 0)
        self.assertGreater(Inventory.objects.filter(company=tenant_one).count(), 0)

        self.assertGreater(Fish.objects.filter(company=tenant_two).count(), 0)
        self.assertGreater(Supplier.objects.filter(company=tenant_two).count(), 0)
        self.assertGreater(Buyer.objects.filter(company=tenant_two).count(), 0)
        self.assertGreater(PurchaseBatch.objects.filter(company=tenant_two).count(), 0)
        self.assertGreater(Sale.objects.filter(company=tenant_two).count(), 0)
        self.assertGreater(Payment.objects.filter(company=tenant_two).count(), 0)
        self.assertGreater(Inventory.objects.filter(company=tenant_two).count(), 0)
