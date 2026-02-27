from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone

from dashboard.models import DashboardManager
from trading.models import FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Sale, Payment, Inventory
from subscriptions.models import Subscription, SubscriptionTier

User = get_user_model()


class DashboardFinancialOverviewTest(TestCase):
    """Test DashboardManager financial overview methods"""
    
    def setUp(self):
        # Create tenant user
        self.tenant = User.objects.create_user(
            username='dash_tenant',
            email='dash@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        # Create category and fish
        self.category = FishCategory.objects.create(
            name="Tuna",
            category_type="saltwater"
        )
        
        self.fish = Fish.objects.create(
            name="Yellowfin Tuna",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        
        # Create supplier and buyer
        self.supplier = Supplier.objects.create(
            name="Fisher Joe",
            phone="1234567890",
            tenant=self.tenant
        )
        
        self.buyer = Buyer.objects.create(
            name="Restaurant ABC",
            phone="9876543210",
            tenant=self.tenant
        )
        
        # Create purchase batch for today
        self.today = timezone.now().date()
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="auction",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("50.00"),
            labour_cost=Decimal("100.00"),
            ice_cost=Decimal("50.00"),
            transport_cost=Decimal("200.00"),
            date=self.today,
            tenant=self.tenant
        )
        
        # Create sale for today
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("27.00"),
            selling_price_per_kg=Decimal("60.00"),
            date=self.today,
            tenant=self.tenant
        )
        
        # Create payment received today
        Payment.objects.create(
            payment_type='sale',
            payment_mode='cash',
            amount=Decimal("5000.00"),
            sale=self.sale,
            date=self.today,
            tenant=self.tenant
        )
    
    def test_get_financial_overview_returns_today_sales(self):
        """Test financial overview returns today's sales amount"""
        result = DashboardManager.get_financial_overview(user=self.tenant)
        
        self.assertIn('today_sales', result)
        self.assertGreater(result['today_sales'], Decimal('0.00'))
    
    def test_get_financial_overview_returns_today_purchases(self):
        """Test financial overview returns today's purchase amount"""
        result = DashboardManager.get_financial_overview(user=self.tenant)
        
        self.assertIn('today_purchases', result)
        self.assertGreater(result['today_purchases'], Decimal('0.00'))
    
    def test_get_financial_overview_returns_outstanding_receivables(self):
        """Test financial overview returns outstanding receivables"""
        result = DashboardManager.get_financial_overview(user=self.tenant)
        
        self.assertIn('outstanding_receivables', result)
    
    def test_get_financial_overview_returns_outstanding_payables(self):
        """Test financial overview returns outstanding payables"""
        result = DashboardManager.get_financial_overview(user=self.tenant)
        
        self.assertIn('outstanding_payables', result)
    
    def test_get_financial_overview_returns_active_buyers_count(self):
        """Test financial overview returns active buyers count"""
        result = DashboardManager.get_financial_overview(user=self.tenant)
        
        self.assertIn('active_buyers_count', result)
        self.assertEqual(result['active_buyers_count'], 1)
    
    def test_get_financial_overview_returns_active_suppliers_count(self):
        """Test financial overview returns active suppliers count"""
        result = DashboardManager.get_financial_overview(user=self.tenant)
        
        self.assertIn('active_suppliers_count', result)
        self.assertEqual(result['active_suppliers_count'], 1)


class DashboardSalesTrendTest(TestCase):
    """Test DashboardManager sales trend methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='trend_tenant',
            email='trend@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Salmon", category_type="saltwater")
        self.fish = Fish.objects.create(name="Atlantic Salmon", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant)
        
        # Create sales for last 7 days
        today = timezone.now().date()
        for i in range(7):
            date = today - timedelta(days=i)
            batch = PurchaseBatch.objects.create(
                purchase_type="direct",
                supplier=self.supplier,
                fish=self.fish,
                number_of_packages=5,
                package_weight=Decimal("20.00"),
                price_per_kg=Decimal("30.00"),
                date=date,
                tenant=self.tenant
            )
            Sale.objects.create(
                batch=batch,
                buyer=self.buyer,
                number_of_packages_sold=3,
                selling_weight_per_package=Decimal("15.00"),
                selling_price_per_kg=Decimal("45.00"),
                date=date,
                tenant=self.tenant
            )
    
    def test_get_sales_trend_returns_daily_data(self):
        """Test sales trend returns data for each day"""
        result = DashboardManager.get_sales_trend(user=self.tenant, days=7)
        
        self.assertEqual(len(result), 7)
        for day in result:
            self.assertIn('date', day)
            self.assertIn('revenue', day)
            self.assertIn('profit', day)
            self.assertIn('count', day)
    
    def test_get_sales_trend_with_filters(self):
        """Test sales trend with additional filters"""
        filters = {'buyer': self.buyer.id}
        result = DashboardManager.get_sales_trend(user=self.tenant, days=7, filters=filters)
        
        self.assertIsNotNone(result)


class DashboardTopBuyersTest(TestCase):
    """Test DashboardManager top buyers methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='topbuyer_tenant',
            email='topbuyer@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        
        # Create multiple buyers with different sales
        self.buyer1 = Buyer.objects.create(name="Big Buyer", tenant=self.tenant)
        self.buyer2 = Buyer.objects.create(name="Small Buyer", tenant=self.tenant)
        
        batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=20,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            tenant=self.tenant
        )
        
        # Big buyer purchases more
        Sale.objects.create(
            batch=batch,
            buyer=self.buyer1,
            number_of_packages_sold=10,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            tenant=self.tenant
        )
        
        # Small buyer purchases less
        Sale.objects.create(
            batch=batch,
            buyer=self.buyer2,
            number_of_packages_sold=2,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            tenant=self.tenant
        )
    
    def test_get_top_buyers_returns_ordered_list(self):
        """Test top buyers returns buyers ordered by revenue"""
        result = DashboardManager.get_top_buyers(user=self.tenant, limit=5)
        
        self.assertEqual(len(result), 2)
        # First should be Big Buyer with higher revenue
        self.assertEqual(result[0]['buyer__name'], "Big Buyer")
    
    def test_get_top_buyers_respects_limit(self):
        """Test top buyers respects the limit parameter"""
        result = DashboardManager.get_top_buyers(user=self.tenant, limit=1)
        
        self.assertEqual(len(result), 1)


class DashboardInventoryOverviewTest(TestCase):
    """Test DashboardManager inventory overview methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='inv_tenant',
            email='inv@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        
        # Create batch and inventory
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=15,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("45.00"),
            tenant=self.tenant
        )
        
        self.inventory = Inventory.objects.create(
            fish=self.fish,
            purchase_batch=self.batch,
            initial_packages=15,
            remaining_packages=15,
            initial_weight_kg=Decimal("555.00"),
            remaining_weight_kg=Decimal("555.00"),
            reorder_level=5,
            tenant=self.tenant
        )
    
    def test_get_inventory_overview_returns_total_packages(self):
        """Test inventory overview returns total packages"""
        result = DashboardManager.get_inventory_overview(user=self.tenant)
        
        self.assertIn('total_packages', result)
        self.assertEqual(result['total_packages'], 15)
    
    def test_get_inventory_overview_returns_total_weight(self):
        """Test inventory overview returns total weight"""
        result = DashboardManager.get_inventory_overview(user=self.tenant)
        
        self.assertIn('total_weight_kg', result)
    
    def test_get_inventory_overview_returns_inventory_value(self):
        """Test inventory overview returns inventory value"""
        result = DashboardManager.get_inventory_overview(user=self.tenant)
        
        self.assertIn('inventory_value', result)
        self.assertGreater(result['inventory_value'], Decimal('0.00'))
    
    def test_get_inventory_by_category_returns_data(self):
        """Test inventory by category returns breakdown"""
        result = DashboardManager.get_inventory_by_category(user=self.tenant)
        
        self.assertIsInstance(result, list)


class DashboardPaymentCashflowTest(TestCase):
    """Test DashboardManager payment and cashflow methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='cashflow_tenant',
            email='cashflow@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant)
        
        today = timezone.now().date()
        
        # Create purchase batch and payment out
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            date=today,
            tenant=self.tenant
        )
        
        Payment.objects.create(
            payment_type='purchase',
            payment_mode='cash',
            amount=Decimal("3000.00"),
            supplier=self.supplier,
            date=today,
            tenant=self.tenant
        )
        
        # Create sale and payment in
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            date=today,
            tenant=self.tenant
        )
        
        Payment.objects.create(
            payment_type='sale',
            payment_mode='bank_transfer',
            amount=Decimal("2000.00"),
            sale=self.sale,
            date=today,
            tenant=self.tenant
        )
    
    def test_get_payment_cashflow_returns_daily_data(self):
        """Test payment cashflow returns data for each day"""
        result = DashboardManager.get_payment_cashflow(user=self.tenant, days=7)
        
        self.assertEqual(len(result), 7)
        for day in result:
            self.assertIn('date', day)
            self.assertIn('payments_in', day)
            self.assertIn('payments_out', day)
            self.assertIn('net_flow', day)
    
    def test_get_payment_summary_returns_data(self):
        """Test payment summary returns expected fields"""
        result = DashboardManager.get_payment_summary(user=self.tenant)
        
        self.assertIn('payments_received_today', result)
        self.assertIn('pending_sales_amount', result)
        self.assertIn('supplier_dues_amount', result)


class DashboardRiskAlertsTest(TestCase):
    """Test DashboardManager risk alerts methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='risk_tenant',
            email='risk@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant)
        
        # Create batch with expired inventory
        yesterday = timezone.now().date() - timedelta(days=1)
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            date=yesterday,
            tenant=self.tenant
        )
        
        self.inventory = Inventory.objects.create(
            fish=self.fish,
            purchase_batch=self.batch,
            initial_packages=10,
            remaining_packages=10,
            initial_weight_kg=Decimal("200.00"),
            remaining_weight_kg=Decimal("200.00"),
            expiry_date=yesterday,  # Expired yesterday
            reorder_level=5,
            tenant=self.tenant
        )
        
        # Create low stock inventory
        self.low_stock_batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=3,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            tenant=self.tenant
        )
        
        Inventory.objects.create(
            fish=self.fish,
            purchase_batch=self.low_stock_batch,
            initial_packages=3,
            remaining_packages=2,
            initial_weight_kg=Decimal("60.00"),
            remaining_weight_kg=Decimal("40.00"),
            reorder_level=5,
            status='low_stock',
            tenant=self.tenant
        )
    
    def test_get_risk_alerts_returns_alert_list(self):
        """Test risk alerts returns list of alerts"""
        result = DashboardManager.get_risk_alerts(user=self.tenant)
        
        self.assertIsInstance(result, list)
    
    def test_get_risk_alerts_includes_expired_inventory(self):
        """Test risk alerts includes expired inventory alert"""
        result = DashboardManager.get_risk_alerts(user=self.tenant)
        
        alert_types = [alert['type'] for alert in result]
        self.assertIn('expired_inventory', alert_types)
    
    def test_get_risk_alerts_includes_low_stock(self):
        """Test risk alerts includes low stock alert"""
        result = DashboardManager.get_risk_alerts(user=self.tenant)
        
        alert_types = [alert['type'] for alert in result]
        self.assertIn('low_stock', alert_types)


class DashboardOperationalTest(TestCase):
    """Test DashboardManager operational dashboard methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='oper_tenant',
            email='oper@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant)
        
        # Create pending sale (delivery pending)
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            tenant=self.tenant
        )
        
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            delivery_status='pending',
            tenant=self.tenant
        )
    
    def test_get_operational_dashboard_returns_data(self):
        """Test operational dashboard returns expected fields"""
        result = DashboardManager.get_operational_dashboard(user=self.tenant)
        
        self.assertIn('orders_to_deliver', result)
        self.assertIn('pending_purchases', result)
        self.assertIn('sales_waiting_payment', result)


class DashboardSummaryTest(TestCase):
    """Test DashboardManager summary methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='summary_tenant',
            email='summary@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant)
        
        today = timezone.now().date()
        
        # Create today's data
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            date=today,
            tenant=self.tenant
        )
        
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            date=today,
            tenant=self.tenant
        )
    
    def test_get_today_summary_returns_today_data(self):
        """Test today summary returns today's data"""
        result = DashboardManager.get_today_summary(user=self.tenant)
        
        self.assertIn('date', result)
        self.assertIn('total_purchase_amount', result)
        self.assertIn('total_sales_amount', result)
        self.assertIn('total_profit', result)
    
    def test_get_monthly_summary_returns_month_data(self):
        """Test monthly summary returns monthly data"""
        result = DashboardManager.get_monthly_summary(user=self.tenant)
        
        self.assertIn('month', result)
        self.assertIn('total_purchase_amount', result)
        self.assertIn('total_sales_amount', result)
    
    def test_get_yearly_summary_returns_year_data(self):
        """Test yearly summary returns yearly data"""
        result = DashboardManager.get_yearly_summary(user=self.tenant)
        
        self.assertIn('year', result)
        self.assertIn('total_purchase_amount', result)
        self.assertIn('monthly_breakdown', result)


class DashboardProfitBreakdownTest(TestCase):
    """Test DashboardManager profit breakdown methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='profit_tenant',
            email='profit@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant)
        
        # Create batch with purchase type
        self.batch = PurchaseBatch.objects.create(
            purchase_type="auction",
            place_of_buying="Fish Market",
            fisherman_name="John Fisher",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            tenant=self.tenant
        )
        
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            tenant=self.tenant
        )
    
    def test_get_profit_by_purchase_type(self):
        """Test profit by purchase type breakdown"""
        result = DashboardManager.get_profit_by_purchase_type(user=self.tenant)
        
        self.assertIsInstance(result, list)
    
    def test_get_profit_by_place(self):
        """Test profit by place breakdown"""
        result = DashboardManager.get_profit_by_place(user=self.tenant)
        
        self.assertIsInstance(result, list)
    
    def test_get_profit_by_fisherman(self):
        """Test profit by fisherman breakdown"""
        result = DashboardManager.get_profit_by_fisherman(user=self.tenant)
        
        self.assertIsInstance(result, list)
    
    def test_get_profit_by_fish_type(self):
        """Test profit by fish type breakdown"""
        result = DashboardManager.get_profit_by_fish_type(user=self.tenant)
        
        self.assertIsInstance(result, list)


class DashboardPendingPaymentsTest(TestCase):
    """Test DashboardManager pending payments methods"""
    
    def setUp(self):
        self.tenant = User.objects.create_user(
            username='pending_tenant',
            email='pending@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        self.fish = Fish.objects.create(name="Test Fish", category=self.category, unit_type="kg", tenant=self.tenant)
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant)
        
        # Create pending purchase
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            pending_amount=Decimal("100.00"),
            tenant=self.tenant
        )
        
        # Create pending sale
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            pending_amount=Decimal("150.00"),
            tenant=self.tenant
        )
    
    def test_get_pending_payments_returns_summary(self):
        """Test pending payments returns summary"""
        result = DashboardManager.get_pending_payments(user=self.tenant)
        
        self.assertIn('pending_to_fishermen', result)
        self.assertIn('pending_from_buyers', result)
        self.assertIn('net_pending', result)


class DashboardTenantIsolationTest(TestCase):
    """Test DashboardManager tenant isolation"""
    
    def setUp(self):
        # Create two tenants
        self.tenant1 = User.objects.create_user(
            username='tenant1_dash',
            email='tenant1@dash.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.tenant2 = User.objects.create_user(
            username='tenant2_dash',
            email='tenant2@dash.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.category = FishCategory.objects.create(name="Fish", category_type="saltwater")
        
        # Create fish for tenant1
        self.fish1 = Fish.objects.create(
            name="Tenant1 Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant1
        )
        
        # Create fish for tenant2
        self.fish2 = Fish.objects.create(
            name="Tenant2 Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant2
        )
        
        self.supplier = Supplier.objects.create(name="Supplier", tenant=self.tenant1)
        self.buyer = Buyer.objects.create(name="Buyer", tenant=self.tenant1)
        
        # Create data for tenant1 only
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish1,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            tenant=self.tenant1
        )
        
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("50.00"),
            tenant=self.tenant1
        )
    
    def test_tenant1_only_sees_own_data(self):
        """Test tenant1 only sees their own data"""
        result = DashboardManager.get_today_summary(user=self.tenant1)
        
        self.assertEqual(result['sale_count'], 1)
        self.assertEqual(result['purchase_count'], 1)
    
    def test_tenant2_sees_empty_data(self):
        """Test tenant2 sees empty data (no sales/purchases)"""
        result = DashboardManager.get_today_summary(user=self.tenant2)
        
        self.assertEqual(result['sale_count'], 0)
        self.assertEqual(result['purchase_count'], 0)
    
    def test_tenant_isolation_financial_overview(self):
        """Test financial overview respects tenant isolation"""
        result1 = DashboardManager.get_financial_overview(user=self.tenant1)
        result2 = DashboardManager.get_financial_overview(user=self.tenant2)
        
        # Tenant1 should have data
        self.assertGreater(result1['active_buyers_count'], 0)
        
        # Tenant2 should have no data
        self.assertEqual(result2['active_buyers_count'], 0)


class DashboardAdminTest(TestCase):
    """Test DashboardManager admin/superuser methods"""
    
    def setUp(self):
        # Create superuser
        self.admin = User.objects.create_superuser(
            username='admin_dash',
            email='admin@dash.com',
            password='admin123'
        )
        
        # Create regular tenant
        self.tenant = User.objects.create_user(
            username='regular_tenant',
            email='regular@tenant.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        # Create subscription tier
        self.tier = SubscriptionTier.objects.create(
            name="premium",
            price_monthly=Decimal("99.00"),
            is_active=True
        )
        
        # Create subscription
        self.subscription = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.tenant
        )
    
    def test_admin_dashboard_returns_platform_data(self):
        """Test admin dashboard returns platform-wide data"""
        result = DashboardManager.get_admin_dashboard(self.admin)
        
        self.assertIn('total_tenants', result)
        self.assertIn('active_subscriptions', result)
        self.assertIn('tier_breakdown', result)
    
    def test_non_admin_cannot_access_admin_dashboard(self):
        """Test non-admin cannot access admin dashboard"""
        result = DashboardManager.get_admin_dashboard(self.tenant)
        
        self.assertIn('error', result)

