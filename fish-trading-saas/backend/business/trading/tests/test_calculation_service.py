import pytest
from decimal import Decimal
from services.trading.calculation_service import CalculationService

@pytest.mark.unit
class TestCalculationService:
    
    def test_calculate_purchase_metrics_basic(self):
        metrics = CalculationService.calculate_purchase_metrics(
            packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("150.00"),
            labour_cost=Decimal("500.00"),
            ice_cost=Decimal("200.00"),
            transport_cost=Decimal("1000.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("5000.00")
        )
        
        assert metrics['total_weight'] == Decimal("200.00")
        assert metrics['fish_cost'] == Decimal("30000.00")
        # Total expense = 30000 + 500 + 200 + 1000 = 31700
        assert metrics['total_expense'] == Decimal("31700.00")
        assert metrics['actual_cost_per_kg'] == Decimal("31700.00") / Decimal("200.00")
        assert metrics['pending_amount'] == Decimal("26700.00") # 31700 - 5000
        assert metrics['status'] == 'partial'

    def test_calculate_purchase_metrics_explicit_pending(self):
        metrics = CalculationService.calculate_purchase_metrics(
            packages=10,
            package_weight=Decimal("10.00"),
            price_per_kg=Decimal("100.00"),
            labour_cost=Decimal("0.00"),
            ice_cost=Decimal("0.00"),
            transport_cost=Decimal("0.00"),
            commission_cost=Decimal("0.00"),
            other_cost=Decimal("0.00"),
            amount_paid=Decimal("0.00"),
            explicit_pending=Decimal("5000.00")
        )
        
        # Total expense = 10 * 10 * 100 = 10000
        assert metrics['total_expense'] == Decimal("10000.00")
        assert metrics['pending_amount'] == Decimal("5000.00")
        assert metrics['amount_paid'] == Decimal("5000.00") # Auto-calculated from explicit pending
        assert metrics['status'] == 'partial'

    def test_calculate_sale_metrics_basic(self):
        metrics = CalculationService.calculate_sale_metrics(
            packages_sold=5,
            selling_weight_per_package=Decimal("20.00"),
            selling_price_per_kg=Decimal("200.00"),
            batch_buy_price=Decimal("150.00"),
            amount_received=Decimal("10000.00"),
            discount_amount=Decimal("0.00"),
            discount_percent=Decimal("0.00"),
            tax_percent=Decimal("0.00")
        )
        
        # 5 * 20 = 100 kg
        assert metrics['total_revenue'] == Decimal("20000.00")
        assert metrics['total_cost'] == Decimal("15000.00")
        assert metrics['profit'] == Decimal("5000.00")
        assert metrics['profit_margin_percent'] == Decimal("25.00") # (5000/20000) * 100
        assert metrics['pending_amount'] == Decimal("10000.00")

    def test_calculate_sale_metrics_discounts_taxes(self):
        metrics = CalculationService.calculate_sale_metrics(
            packages_sold=1,
            selling_weight_per_package=Decimal("10.00"),
            selling_price_per_kg=Decimal("100.00"),
            batch_buy_price=Decimal("50.00"),
            amount_received=Decimal("0.00"),
            discount_amount=Decimal("0.00"),
            discount_percent=Decimal("10.00"),
            tax_percent=Decimal("5.00")
        )
        
        # Revenue = 1000
        assert metrics['total_revenue'] == Decimal("1000.00")
        # Discounted amount = 900
        # Tax = 5% of 900 = 45
        assert metrics['tax_amount'] == Decimal("45.00")
        assert metrics['final_amount'] == Decimal("945.00")
        assert metrics['pending_amount'] == Decimal("945.00")
