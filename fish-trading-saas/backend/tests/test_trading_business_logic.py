"""
Tests for trading business logic: calculated fields on PurchaseBatch and Sale models.
"""
import pytest
from decimal import Decimal

from trading.models import Sale
from tests.factories import (
    UserFactory, FishFactory, BuyerFactory,
    PurchaseBatchFactory,
)

pytestmark = pytest.mark.django_db


class TestPurchaseBatchCalculations:
    """PurchaseBatch cost field calculations."""

    def test_total_weight_calculation(self):
        batch = PurchaseBatchFactory(number_of_packages=8, package_weight=Decimal("25.00"))
        assert batch.total_weight == Decimal("200.00")

    def test_fish_cost_calculation(self):
        batch = PurchaseBatchFactory(
            number_of_packages=10,
            package_weight=Decimal("30.00"),
            price_per_kg=Decimal("80.00"),
        )
        # 10 * 30 * 80 = 24000
        assert batch.fish_cost == Decimal("24000.00")

    def test_total_expense_is_fish_cost_plus_overheads(self):
        batch = PurchaseBatchFactory(
            number_of_packages=2,
            package_weight=Decimal("10.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("50.00"),
            ice_cost=Decimal("20.00"),
            transport_cost=Decimal("30.00"),
            commission_cost=Decimal("10.00"),
            other_cost=Decimal("5.00"),
            amount_paid=Decimal("0.00"),
        )
        # fish_cost = 2*10*100 = 2000; overhead = 50+20+30+10+5 = 115
        assert batch.total_expense == Decimal("2115.00")

    def test_pending_amount_is_expense_minus_paid(self):
        batch = PurchaseBatchFactory(
            number_of_packages=5,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("50.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("1000.00"),
        )
        # fish_cost = 5*20*50 = 5000; paid = 1000; pending = 4000
        assert batch.pending_amount == Decimal("4000.00")

    def test_actual_cost_per_kg_calculated(self):
        batch = PurchaseBatchFactory(
            number_of_packages=10,
            package_weight=Decimal("10.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
        )
        # fish_cost=10000; total_weight=100; actual_cost_per_kg=100
        assert batch.actual_cost_per_kg == Decimal("100.00")

    def test_zero_overhead_total_expense_equals_fish_cost(self):
        batch = PurchaseBatchFactory(
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
        )
        assert batch.total_expense == batch.fish_cost


class TestSaleCalculations:
    """Sale profit, revenue, margin, and pending amount calculations."""

    def _make_sale(self, packages_bought=10, pkg_weight=Decimal("37.00"),
                   buy_price=Decimal("100.00"), sell_price=Decimal("150.00"),
                   packages_sold=5, sell_weight=Decimal("37.00"),
                   amount_received=Decimal("0.00")):
        tenant = UserFactory(role="tenant_admin")
        fish = FishFactory(tenant=tenant)
        buyer = BuyerFactory(tenant=tenant)
        batch = PurchaseBatchFactory(
            tenant=tenant,
            fish=fish,
            number_of_packages=packages_bought,
            package_weight=pkg_weight,
            price_per_kg=buy_price,
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
        )
        sale = Sale.objects.create(
            batch=batch,
            buyer=buyer,
            tenant=tenant,
            company=tenant.company,
            sale_type="retail",
            number_of_packages_sold=packages_sold,
            selling_weight_per_package=sell_weight,
            selling_price_per_kg=sell_price,
            amount_received=amount_received,
        )
        return sale

    def test_total_revenue_calculation(self):
        sale = self._make_sale(packages_sold=5, sell_weight=Decimal("37.00"), sell_price=Decimal("150.00"))
        # 5 * 37 * 150 = 27750
        assert sale.total_revenue == Decimal("27750.00")

    def test_profit_is_revenue_minus_cost(self):
        sale = self._make_sale(
            packages_sold=5,
            sell_weight=Decimal("10.00"),
            buy_price=Decimal("100.00"),
            sell_price=Decimal("150.00"),
        )
        # revenue = 5*10*150=7500; cost = 5*10*100=5000; profit=2500
        assert sale.profit == Decimal("2500.00")

    def test_profit_margin_percent_calculation(self):
        sale = self._make_sale(
            packages_sold=2,
            sell_weight=Decimal("10.00"),
            buy_price=Decimal("100.00"),
            sell_price=Decimal("200.00"),
        )
        # revenue=4000; cost=2000; profit=2000; margin=50%
        assert sale.profit_margin_percent == Decimal("50.00")

    def test_pending_amount_is_total_minus_received(self):
        sale = self._make_sale(
            packages_sold=2,
            sell_weight=Decimal("10.00"),
            sell_price=Decimal("100.00"),
            amount_received=Decimal("500.00"),
        )
        # revenue=2000; pending = 2000-500 = 1500 (final_amount may differ with taxes=0)
        assert sale.pending_amount == sale.final_amount - Decimal("500.00")

    def test_full_payment_sets_status_paid(self):
        sale = self._make_sale(
            packages_sold=1,
            sell_weight=Decimal("10.00"),
            sell_price=Decimal("100.00"),
            amount_received=Decimal("1000.00"),
        )
        assert sale.payment_status == "paid"

    def test_zero_payment_sets_status_pending(self):
        sale = self._make_sale(amount_received=Decimal("0.00"))
        assert sale.payment_status == "pending"
