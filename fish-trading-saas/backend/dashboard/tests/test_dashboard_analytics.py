import pytest
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from trading.models import Sale, PurchaseBatch, Fish, Buyer, Supplier
from companies.models import Company
from dashboard.models import DailySalesSummary, DailyPurchaseSummary, DashboardManager
from dashboard.tasks import _generate_sales_summary, _generate_purchase_summary

@pytest.mark.django_db
class TestDashboardAnalytics:
    @pytest.fixture
    def setup_data(self):
        self.company = Company.objects.create(name="Test Company")
        self.fish = Fish.objects.create(name="Vanjaram", company=self.company)
        self.buyer = Buyer.objects.create(name="Test Buyer", company=self.company)
        self.supplier = Supplier.objects.create(name="Test Supplier", company=self.company)
        self.today = timezone.now().date()

        # Create a purchase
        self.purchase = PurchaseBatch.objects.create(
            company=self.company,
            supplier=self.supplier,
            fish=self.fish,
            date=self.today,
            number_of_packages=10,
            package_weight=10.0,
            price_per_kg=Decimal('100.00'),
            labour_cost=Decimal('50.00')
        )

        # Create a sale
        self.sale1 = Sale.objects.create(
            company=self.company,
            buyer=self.buyer,
            batch=self.purchase,
            date=self.today,
            number_of_packages_sold=5,
            selling_weight_per_package=10.0,
            selling_price_per_kg=Decimal('150.00')
        )

        self.sale2 = Sale.objects.create(
            company=self.company,
            buyer=self.buyer,
            batch=self.purchase,
            date=self.today,
            number_of_packages_sold=2,
            selling_weight_per_package=10.0,
            selling_price_per_kg=Decimal('160.00')
        )

    def test_daily_sales_rollup_accuracy(self, setup_data):
        # Generate summary
        _generate_sales_summary(self.company, self.today)
        
        # Verify
        summary = DailySalesSummary.objects.get(company=self.company, date=self.today)
        assert summary.sales_count == 2
        
        expected_revenue = self.sale1.total_revenue + self.sale2.total_revenue
        assert summary.total_revenue == expected_revenue
        
        expected_profit = self.sale1.profit + self.sale2.profit
        assert summary.total_profit == expected_profit

    def test_dashboard_manager_trend(self, setup_data):
        _generate_sales_summary(self.company, self.today)
        
        # Mock user object
        class MockUser:
            company_id = self.company.id
            company = self.company
            is_superuser = False
            is_platform_user = False

        user = MockUser()
        trend = DashboardManager.get_sales_trend(user=user, days=7)
        
        today_data = next((item for item in trend if item['date'] == self.today), None)
        assert today_data is not None
        assert today_data['count'] == 2
        
        expected_revenue = self.sale1.total_revenue + self.sale2.total_revenue
        assert today_data['revenue'] == expected_revenue
