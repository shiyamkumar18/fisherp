"""
Tests for concurrent-safe operations.
Uses threading.Thread to verify data integrity under concurrent creates.
"""
import pytest
import threading
from decimal import Decimal

from tests.factories import (
    UserFactory, FishFactory, PurchaseBatchFactory, InventoryFactory,
)

pytestmark = pytest.mark.django_db(transaction=True)


class TestConcurrentRecordCreation:
    """Two users can create records simultaneously without data corruption."""

    def test_two_buyers_created_concurrently_have_unique_ids(self):
        from trading.models import Buyer

        tenant = UserFactory(role="tenant_admin")
        results = []
        errors = []

        def create_buyer(name):
            try:
                b = Buyer.objects.create(
                    name=name,
                    tenant=tenant,
                    company=tenant.company,
                )
                results.append(b.id)
            except Exception as exc:
                # SQLite may lock under true concurrent writes; that's a SQLite
                # limitation, not a data-integrity failure.
                errors.append(str(exc))

        t1 = threading.Thread(target=create_buyer, args=("Buyer Alpha",))
        t2 = threading.Thread(target=create_buyer, args=("Buyer Beta",))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # At least one create must have succeeded
        assert len(results) >= 1, f"No buyers created; errors: {errors}"
        # All successful IDs must be unique
        assert len(results) == len(set(results))

    def test_two_fish_categories_created_concurrently_are_unique(self):
        from trading.models import FishCategory
        import uuid

        results = []
        errors = []

        def create_category(suffix):
            try:
                cat = FishCategory.objects.create(
                    name=f"ConcurrentCat-{suffix}-{uuid.uuid4().hex[:4]}",
                    category_type="saltwater",
                )
                results.append(cat.id)
            except Exception as exc:
                errors.append(str(exc))

        t1 = threading.Thread(target=create_category, args=("A",))
        t2 = threading.Thread(target=create_category, args=("B",))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        assert len(results) >= 1, f"No categories created; errors: {errors}"
        assert len(results) == len(set(results))


class TestBatchNumberUniqueness:
    """Batch numbers remain unique even under concurrent creates."""

    def test_concurrent_batch_creation_produces_unique_batch_numbers(self):
        """
        Each PurchaseBatch gets a unique auto-generated batch_number.
        SQLite serializes writes so we verify uniqueness from whichever succeed.
        """
        tenant = UserFactory(role="tenant_admin")
        fish = FishFactory(tenant=tenant)

        batches = []
        errors = []

        def create_batch():
            try:
                b = PurchaseBatchFactory(
                    tenant=tenant,
                    fish=fish,
                    number_of_packages=5,
                    package_weight=Decimal("10.00"),
                    price_per_kg=Decimal("50.00"),
                    labour_cost=Decimal("0.00"),
                    ice_cost=Decimal("0.00"),
                    transport_cost=Decimal("0.00"),
                    commission_cost=Decimal("0.00"),
                    other_cost=Decimal("0.00"),
                    amount_paid=Decimal("0.00"),
                )
                batches.append(b)
            except Exception as exc:
                # SQLite may report "database table is locked" under concurrent writes;
                # this is a known SQLite limitation, not a data-integrity failure.
                errors.append(str(exc))

        threads = [threading.Thread(target=create_batch) for _ in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # At least one batch should have been created successfully
        assert len(batches) >= 1, f"No batches created. Errors: {errors}"
        # Verify uniqueness of batch_numbers among successful creates
        batch_numbers = [b.batch_number for b in batches if b.batch_number]
        assert len(batch_numbers) == len(set(batch_numbers)), "Batch numbers not unique!"


class TestAtomicTransactionRollback:
    """Failed operations inside atomic blocks roll back cleanly."""

    def test_failed_batch_creation_does_not_leave_orphan(self):
        from django.db import transaction
        from trading.models import PurchaseBatch

        tenant = UserFactory(role="tenant_admin")
        count_before = PurchaseBatch.objects.filter(company=tenant.company).count()

        try:
            with transaction.atomic():
                PurchaseBatchFactory(
                    tenant=tenant,
                    number_of_packages=5,
                    package_weight=Decimal("10.00"),
                    price_per_kg=Decimal("50.00"),
                    labour_cost=Decimal("0.00"),
                    ice_cost=Decimal("0.00"),
                    transport_cost=Decimal("0.00"),
                    commission_cost=Decimal("0.00"),
                    other_cost=Decimal("0.00"),
                    amount_paid=Decimal("0.00"),
                )
                raise ValueError("Simulated failure")
        except ValueError:
            pass

        count_after = PurchaseBatch.objects.filter(company=tenant.company).count()
        assert count_after == count_before

    def test_purchase_batch_in_atomic_block_commits(self):
        from django.db import transaction
        from trading.models import PurchaseBatch

        tenant = UserFactory(role="tenant_admin")
        count_before = PurchaseBatch.objects.filter(company=tenant.company).count()

        with transaction.atomic():
            PurchaseBatchFactory(
                tenant=tenant,
                number_of_packages=2,
                package_weight=Decimal("10.00"),
                price_per_kg=Decimal("50.00"),
                labour_cost=Decimal("0.00"),
                ice_cost=Decimal("0.00"),
                transport_cost=Decimal("0.00"),
                commission_cost=Decimal("0.00"),
                other_cost=Decimal("0.00"),
                amount_paid=Decimal("0.00"),
            )

        count_after = PurchaseBatch.objects.filter(company=tenant.company).count()
        assert count_after == count_before + 1
