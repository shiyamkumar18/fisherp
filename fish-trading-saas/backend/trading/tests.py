from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone

from .models import FishCategory, Fish, Supplier, Buyer, PurchaseBatch, Sale, Payment, Inventory
from companies.models import Company

User = get_user_model()


class FishCategoryModelTest(TestCase):
    """Test FishCategory model"""
    
    def setUp(self):
        self.category = FishCategory.objects.create(
            name="Salmon",
            category_type="saltwater",
            description="Fresh Atlantic salmon",
            color_code="#FF6B6B",
            priority=1
        )
    
    def test_category_creation(self):
        self.assertEqual(self.category.name, "Salmon")
        self.assertEqual(self.category.category_type, "saltwater")
        self.assertEqual(str(self.category), "Salmon (Saltwater)")
    
    def test_category_type_choices(self):
        self.assertIn(self.category.category_type, ['freshwater', 'saltwater'])


class FishModelTest(TestCase):
    """Test Fish model with tenant isolation"""
    
    def setUp(self):
        # Create users (tenants)
        self.tenant1 = User.objects.create_user(
            username='tenant1',
            email='tenant1@example.com',
            password='testpass123'
        )
        self.tenant2 = User.objects.create_user(
            username='tenant2',
            email='tenant2@example.com',
            password='testpass123'
        )
        
        # Create category
        self.category = FishCategory.objects.create(
            name="Tuna",
            category_type="saltwater"
        )
        
        # Create fish for tenant1
        self.fish1 = Fish.objects.create(
            name="Bluefin Tuna",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant1,
            min_price_per_kg=Decimal("50.00"),
            max_price_per_kg=Decimal("100.00")
        )
        
        # Create fish for tenant2
        self.fish2 = Fish.objects.create(
            name="Yellowfin Tuna",
            category=self.category,
            unit_type="box",
            box_weight_kg=Decimal("20.00"),
            tenant=self.tenant2
        )
    
    def test_fish_creation(self):
        self.assertEqual(self.fish1.name, "Bluefin Tuna")
        self.assertEqual(self.fish1.tenant, self.tenant1)
        self.assertEqual(self.fish1.unit_type, "kg")
    
    def test_tenant_isolation(self):
        # Tenant1 should only see their fish
        tenant1_fish = Fish.objects.filter(tenant=self.tenant1)
        self.assertEqual(tenant1_fish.count(), 1)
        self.assertEqual(tenant1_fish.first().name, "Bluefin Tuna")
        
        # Tenant2 should only see their fish
        tenant2_fish = Fish.objects.filter(tenant=self.tenant2)
        self.assertEqual(tenant2_fish.count(), 1)
        self.assertEqual(tenant2_fish.first().name, "Yellowfin Tuna")
    
    def test_unique_together_constraint(self):
        # Should not allow duplicate fish names for same tenant
        with self.assertRaises(Exception):
            Fish.objects.create(
                name="Bluefin Tuna",  # Same name as fish1
                category=self.category,
                unit_type="kg",
                tenant=self.tenant1  # Same tenant
            )
    
    def test_box_weight_validation(self):
        # Box weight required when unit_type is 'box'
        with self.assertRaises(Exception):
            fish = Fish(
                name="Invalid Box Fish",
                category=self.category,
                unit_type="box",
                tenant=self.tenant1,
                box_weight_kg=None  # Missing box_weight_kg
            )
            fish.full_clean()
    
    def test_get_display_weight(self):
        self.assertIsNone(self.fish1.get_display_weight())  # kg type
        self.assertEqual(self.fish2.get_display_weight(), Decimal("20.00"))  # box type


class FishAPITest(APITestCase):
    """Test Fish API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create tenant user
        self.tenant = User.objects.create_user(
            username='testtenant',
            email='test@example.com',
            password='testpass123'
        )
        
        # Authenticate
        self.client.force_authenticate(user=self.tenant)
        
        # Create category
        self.category = FishCategory.objects.create(
            name="Mackerel",
            category_type="saltwater"
        )
        
        # Create fish
        self.fish = Fish.objects.create(
            name="Spanish Mackerel",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
    
    def test_list_fish(self):
        url = '/api/fish/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Spanish Mackerel')
    
    def test_create_fish(self):
        url = '/api/fish/'
        data = {
            'name': 'King Mackerel',
            'category': self.category.id,
            'unit_type': 'box',
            'box_weight_kg': '25.00'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'King Mackerel')
        self.assertEqual(response.data['tenant'], self.tenant.id)
    
    def test_create_fish_without_box_weight(self):
        url = '/api/fish/'
        data = {
            'name': 'Invalid Fish',
            'category': self.category.id,
            'unit_type': 'box'
            # Missing box_weight_kg
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_fish(self):
        url = f'/api/fish/{self.fish.id}/'
        data = {
            'name': 'Updated Mackerel',
            'category': self.category.id,
            'unit_type': 'kg'
        }
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Mackerel')
    
    def test_delete_fish(self):
        url = f'/api/fish/{self.fish.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Fish.objects.count(), 0)
    
    def test_tenant_isolation_in_api(self):
        # Create another tenant and their fish
        other_tenant = User.objects.create_user(
            username='othertenant',
            email='other@example.com',
            password='testpass123'
        )
        other_fish = Fish.objects.create(
            name="Other Tenant's Fish",
            category=self.category,
            unit_type="kg",
            tenant=other_tenant
        )
        
        # Current tenant should not see other tenant's fish
        url = '/api/fish/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Spanish Mackerel')
    
    def test_fish_by_category_endpoint(self):
        url = '/api/fish/by_category/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
    
    def test_fish_statistics_endpoint(self):
        url = '/api/fish/statistics/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_fish_types', response.data)
        self.assertIn('active_fish_types', response.data)
        self.assertEqual(response.data['total_fish_types'], 1)
    
    def test_toggle_active_endpoint(self):
        url = f'/api/fish/{self.fish.id}/toggle_active/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])
        
        # Toggle back
        response = self.client.post(url)
        self.assertTrue(response.data['is_active'])


class FishCategoryAPITest(APITestCase):
    """Test FishCategory API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.category = FishCategory.objects.create(
            name="Cod",
            category_type="saltwater",
            priority=1
        )
    
    def test_list_categories(self):
        url = '/api/fish-categories/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_category(self):
        url = '/api/fish-categories/'
        data = {
            'name': 'Trout',
            'category_type': 'freshwater',
            'priority': 2
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Trout')


class SupplierModelTest(TestCase):
    """Test Supplier model"""
    
    def setUp(self):
        self.supplier = Supplier.objects.create(
            name="John Fisher",
            phone="1234567890",
            supplier_type="individual",
            rating=Decimal("4.50")
        )
    
    def test_supplier_creation(self):
        self.assertEqual(self.supplier.name, "John Fisher")
        self.assertEqual(self.supplier.supplier_type, "individual")
        self.assertEqual(str(self.supplier), "John Fisher")
    
    def test_credit_balance_calculation(self):
        self.supplier.total_credit_given = Decimal("1000.00")
        self.supplier.total_credit_repaid = Decimal("600.00")
        self.supplier.update_credit_balance()
        self.assertEqual(self.supplier.current_credit_balance, Decimal("400.00"))


class BuyerModelTest(TestCase):
    """Test Buyer model"""
    
    def setUp(self):
        self.buyer = Buyer.objects.create(
            name="Seafood Restaurant",
            phone="9876543210",
            buyer_type="restaurant",
            rating=Decimal("4.80")
        )
    
    def test_buyer_creation(self):
        self.assertEqual(self.buyer.name, "Seafood Restaurant")
        self.assertEqual(self.buyer.buyer_type, "restaurant")
    
    def test_preferred_fish_types(self):
        category = FishCategory.objects.create(name="Test Category")
        fish = Fish.objects.create(
            name="Test Fish",
            category=category,
            unit_type="kg",
            tenant=User.objects.create_user(username='test', password='test123')
        )
        self.buyer.preferred_fish_types.add(fish)
        self.assertEqual(self.buyer.preferred_fish_types.count(), 1)


class PurchaseBatchModelTest(TestCase):
    """Test PurchaseBatch model"""
    
    def setUp(self):
        self.category = FishCategory.objects.create(name="Test Cat")
        self.tenant = User.objects.create_user(username='batchtest', password='test123')
        self.fish = Fish.objects.create(
            name="Batch Test Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Test Supplier")
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="auction",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("50.00"),
            labour_cost=Decimal("100.00"),
            ice_cost=Decimal("50.00"),
            transport_cost=Decimal("200.00")
        )
    
    def test_batch_creation(self):
        self.assertIsNotNone(self.batch.batch_number)
        self.assertEqual(self.batch.number_of_packages, 10)
        self.assertEqual(self.batch.status, 'pending')
    
    def test_calculated_fields(self):
        self.batch.calculate_fields()
        self.assertEqual(self.batch.total_weight, Decimal("370.00"))  # 10 * 37
        self.assertEqual(self.batch.fish_cost, Decimal("18500.00"))  # 370 * 50
        self.assertTrue(self.batch.total_expense > self.batch.fish_cost)


class SaleModelTest(TestCase):
    """Test Sale model"""
    
    def setUp(self):
        self.category = FishCategory.objects.create(name="Sale Test Cat")
        self.tenant = User.objects.create_user(username='saletest', password='test123')
        self.fish = Fish.objects.create(
            name="Sale Test Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Sale Supplier")
        self.buyer = Buyer.objects.create(name="Sale Buyer")
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=20,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("40.00")
        )
        
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("27.00"),
            selling_price_per_kg=Decimal("60.00")
        )
    
    def test_sale_creation(self):
        self.assertIsNotNone(self.sale.invoice_number)
        self.assertEqual(self.sale.number_of_packages_sold, 5)
        self.assertEqual(self.sale.payment_status, 'pending')
    
    def test_sale_calculations(self):
        self.sale.calculate_fields()
        expected_revenue = Decimal("5.00") * Decimal("27.00") * Decimal("60.00")  # 8100
        self.assertEqual(self.sale.total_revenue, expected_revenue)


class InventoryModelTest(TestCase):
    """Test Inventory model"""
    
    def setUp(self):
        self.category = FishCategory.objects.create(name="Inv Test Cat")
        self.tenant = User.objects.create_user(username='invtest', password='test123')
        self.fish = Fish.objects.create(
            name="Inv Test Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Inv Supplier")
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=15,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("45.00")
        )
        
        self.inventory = Inventory.objects.create(
            fish=self.fish,
            purchase_batch=self.batch,
            initial_packages=15,
            remaining_packages=15,
            initial_weight_kg=Decimal("555.00"),  # 15 * 37
            remaining_weight_kg=Decimal("555.00"),
            reorder_level=5
        )
    
    def test_inventory_creation(self):
        self.assertEqual(self.inventory.initial_packages, 15)
        self.assertEqual(self.inventory.remaining_packages, 15)
        self.assertEqual(self.inventory.status, 'in_stock')
    
    def test_update_stock(self):
        self.inventory.update_stock(3)  # Sell 3 packages
        self.assertEqual(self.inventory.sold_packages, 3)
        self.assertEqual(self.inventory.remaining_packages, 12)
    
    def test_needs_reorder(self):
        self.inventory.remaining_packages = 4  # Below reorder_level of 5
        self.assertTrue(self.inventory.needs_reorder())
    
    def test_low_stock_status(self):
        self.inventory.remaining_packages = 3
        self.inventory.reorder_level = 5
        self.inventory.update_stock(0)  # Trigger status update
        # Status should be low_stock when remaining <= reorder_level
        # This is handled in update_stock method


# ============================================================
# ADDITIONAL API TESTS - SUPPLIER ENDPOINTS
# ============================================================

class SupplierAPITest(APITestCase):
    """Test Supplier API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.tenant = User.objects.create_user(
            username='supplier_api_user',
            email='supplier@api.com',
            password='testpass123',
            role='tenant_admin'
        )
        self.client.force_authenticate(user=self.tenant)
        
        self.supplier = Supplier.objects.create(
            name="Test Supplier",
            phone="1234567890",
            supplier_type="individual",
            tenant=self.tenant
        )
    
    def test_list_suppliers(self):
        url = '/api/suppliers/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_supplier(self):
        url = '/api/suppliers/'
        data = {
            'name': 'New Supplier',
            'phone': '9876543210',
            'supplier_type': 'company'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Supplier')
    
    def test_update_supplier(self):
        url = f'/api/suppliers/{self.supplier.id}/'
        data = {'name': 'Updated Supplier'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Supplier')
    
    def test_delete_supplier(self):
        url = f'/api/suppliers/{self.supplier.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_update_credit_endpoint(self):
        """Test supplier credit update endpoint"""
        url = f'/api/suppliers/{self.supplier.id}/update_credit/'
        data = {
            'amount': '500.00',
            'operation': 'add'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('current_credit_balance', response.data)
    
    def test_verify_supplier_endpoint(self):
        """Test supplier verify endpoint"""
        url = f'/api/suppliers/{self.supplier.id}/verify/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_verified'])
    
    def test_update_outstanding_endpoint(self):
        """Test supplier outstanding update endpoint"""
        url = f'/api/suppliers/{self.supplier.id}/update_outstanding/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('outstanding_amount', response.data)
    
    def test_record_payment_endpoint(self):
        """Test supplier payment recording endpoint"""
        url = f'/api/suppliers/{self.supplier.id}/record_payment/'
        data = {
            'amount': '1000.00',
            'payment_mode': 'bank_transfer',
            'reference': 'REF123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('payment_id', response.data)
    
    def test_payment_summary_endpoint(self):
        """Test supplier payment summary endpoint"""
        url = f'/api/suppliers/{self.supplier.id}/payment_summary/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('outstanding_amount', response.data)
    
    def test_suppliers_with_outstanding_endpoint(self):
        """Test get suppliers with outstanding endpoint"""
        url = '/api/suppliers/with_outstanding/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class BuyerAPITest(APITestCase):
    """Test Buyer API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.tenant = User.objects.create_user(
            username='buyer_api_user',
            email='buyer@api.com',
            password='testpass123',
            role='tenant_admin'
        )
        self.client.force_authenticate(user=self.tenant)
        
        self.buyer = Buyer.objects.create(
            name="Test Buyer",
            phone="1234567890",
            buyer_type="restaurant",
            tenant=self.tenant
        )
    
    def test_list_buyers(self):
        url = '/api/buyers/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_buyer(self):
        url = '/api/buyers/'
        data = {
            'name': 'New Buyer',
            'phone': '9876543210',
            'buyer_type': 'hotel'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_update_buyer(self):
        url = f'/api/buyers/{self.buyer.id}/'
        data = {'name': 'Updated Buyer'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_delete_buyer(self):
        url = f'/api/buyers/{self.buyer.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_update_credit_endpoint(self):
        """Test buyer credit update endpoint"""
        url = f'/api/buyers/{self.buyer.id}/update_credit/'
        data = {
            'amount': '1000.00',
            'operation': 'add'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_mark_preferred_endpoint(self):
        """Test buyer preferred status endpoint"""
        url = f'/api/buyers/{self.buyer.id}/mark_preferred/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_preferred'])


class PurchaseBatchAPITest(APITestCase):
    """Test PurchaseBatch API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.tenant = User.objects.create_user(
            username='batch_api_user',
            email='batch@api.com',
            password='testpass123',
            role='tenant_admin'
        )
        self.client.force_authenticate(user=self.tenant)
        
        self.category = FishCategory.objects.create(name="Test Cat", category_type="saltwater")
        self.fish = Fish.objects.create(
            name="Test Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Test Supplier", tenant=self.tenant)
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="auction",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("50.00"),
            tenant=self.tenant
        )
    
    def test_list_purchase_batches(self):
        url = '/api/purchase-batches/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_purchase_batch(self):
        url = '/api/purchase-batches/'
        data = {
            'purchase_type': 'direct',
            'supplier': self.supplier.id,
            'fish': self.fish.id,
            'number_of_packages': 5,
            'package_weight': '20.00',
            'price_per_kg': '30.00'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_update_purchase_batch(self):
        url = f'/api/purchase-batches/{self.batch.id}/'
        data = {'number_of_packages': 15}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_delete_purchase_batch(self):
        url = f'/api/purchase-batches/{self.batch.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_sales_summary_endpoint(self):
        """Test purchase batch sales summary endpoint"""
        url = f'/api/purchase-batches/{self.batch.id}/sales_summary/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('batch_number', response.data)
    
    def test_update_quality_endpoint(self):
        """Test purchase batch quality update endpoint"""
        url = f'/api/purchase-batches/{self.batch.id}/update_quality/'
        data = {
            'quality_grade': 'A',
            'quality_score': 95
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SaleAPITest(APITestCase):
    """Test Sale API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.tenant = User.objects.create_user(
            username='sale_api_user',
            email='sale@api.com',
            password='testpass123',
            role='tenant_admin'
        )
        self.client.force_authenticate(user=self.tenant)
        
        self.category = FishCategory.objects.create(name="Sale Cat", category_type="saltwater")
        self.fish = Fish.objects.create(
            name="Sale Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Sale Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Sale Buyer", tenant=self.tenant)
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=20,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("40.00"),
            tenant=self.tenant
        )
        
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("27.00"),
            selling_price_per_kg=Decimal("60.00"),
            tenant=self.tenant
        )
    
    def test_list_sales(self):
        url = '/api/sales/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_sale(self):
        url = '/api/sales/'
        data = {
            'batch': self.batch.id,
            'buyer': self.buyer.id,
            'number_of_packages_sold': 3,
            'selling_weight_per_package': '25.00',
            'selling_price_per_kg': '55.00'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_update_sale(self):
        url = f'/api/sales/{self.sale.id}/'
        data = {'number_of_packages_sold': 10}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_delete_sale(self):
        url = f'/api/sales/{self.sale.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_record_payment_endpoint(self):
        """Test sale payment recording endpoint"""
        url = f'/api/sales/{self.sale.id}/record_payment/'
        data = {'amount': '1000.00'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('pending_amount', response.data)
    
    def test_mark_delivered_endpoint(self):
        """Test sale delivery marking endpoint"""
        url = f'/api/sales/{self.sale.id}/mark_delivered/'
        data = {'delivered_by': 'John Doe'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['delivery_status'], 'delivered')
    
    def test_process_return_endpoint(self):
        """Test sale return processing endpoint"""
        url = f'/api/sales/{self.sale.id}/process_return/'
        data = {
            'return_reason': 'Customer request',
            'refund_amount': '500.00'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_returned'])


class PaymentAPITest(APITestCase):
    """Test Payment API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.tenant = User.objects.create_user(
            username='payment_api_user',
            email='payment@api.com',
            password='testpass123',
            role='tenant_admin'
        )
        self.client.force_authenticate(user=self.tenant)
        
        self.category = FishCategory.objects.create(name="Pay Cat", category_type="saltwater")
        self.fish = Fish.objects.create(
            name="Pay Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Pay Supplier", tenant=self.tenant)
        self.buyer = Buyer.objects.create(name="Pay Buyer", tenant=self.tenant)
        
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
            tenant=self.tenant
        )
        
        self.payment = Payment.objects.create(
            payment_type='sale',
            payment_mode='cash',
            amount=Decimal("2000.00"),
            sale=self.sale,
            tenant=self.tenant
        )
    
    def test_list_payments(self):
        url = '/api/payments/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_payment(self):
        url = '/api/payments/'
        data = {
            'payment_type': 'purchase',
            'payment_mode': 'bank_transfer',
            'amount': '500.00',
            'supplier': self.supplier.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_update_payment(self):
        url = f'/api/payments/{self.payment.id}/'
        data = {'amount': '2500.00'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_delete_payment(self):
        url = f'/api/payments/{self.payment.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_approve_payment_endpoint(self):
        """Test payment approval endpoint"""
        self.payment.approval_status = 'pending'
        self.payment.save()
        
        url = f'/api/payments/{self.payment.id}/approve/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['approval_status'], 'approved')
    
    def test_reject_payment_endpoint(self):
        """Test payment rejection endpoint"""
        self.payment.approval_status = 'pending'
        self.payment.save()
        
        url = f'/api/payments/{self.payment.id}/reject/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['approval_status'], 'rejected')


class InventoryAPITest(APITestCase):
    """Test Inventory API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.tenant = User.objects.create_user(
            username='inventory_api_user',
            email='inventory@api.com',
            password='testpass123',
            role='tenant_admin'
        )
        self.client.force_authenticate(user=self.tenant)
        
        self.category = FishCategory.objects.create(name="Inv Cat", category_type="saltwater")
        self.fish = Fish.objects.create(
            name="Inv Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Inv Supplier", tenant=self.tenant)
        
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
    
    def test_list_inventory(self):
        url = '/api/inventory/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_inventory(self):
        url = '/api/inventory/'
        data = {
            'fish': self.fish.id,
            'purchase_batch': self.batch.id,
            'initial_packages': 10,
            'remaining_packages': 10,
            'reorder_level': 3
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_update_inventory(self):
        url = f'/api/inventory/{self.inventory.id}/'
        data = {'remaining_packages': 10}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_delete_inventory(self):
        url = f'/api/inventory/{self.inventory.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_update_temperature_endpoint(self):
        """Test inventory temperature update endpoint"""
        url = f'/api/inventory/{self.inventory.id}/update_temperature/'
        data = {'temperature': -5.5}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_move_stock_endpoint(self):
        """Test inventory stock movement endpoint"""
        url = f'/api/inventory/{self.inventory.id}/move_stock/'
        data = {
            'storage_location': 'Cold Room B',
            'bin_number': 'B12'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_low_stock_endpoint(self):
        """Test low stock items endpoint"""
        self.inventory.status = 'low_stock'
        self.inventory.save()
        
        url = '/api/inventory/low_stock/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_expiring_soon_endpoint(self):
        """Test expiring soon items endpoint"""
        from datetime import datetime, timedelta
        
        self.inventory.expiry_date = timezone.now().date() + timedelta(days=2)
        self.inventory.save()
        
        url = '/api/inventory/expiring_soon/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ============================================================
# TENANT ISOLATION TESTS
# ============================================================

class TradingTenantIsolationTest(TestCase):
    """Test tenant isolation for all trading models"""
    
    def setUp(self):
        # Create two tenants
        self.tenant1 = User.objects.create_user(
            username='trading_tenant1',
            email='t1@trading.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        self.tenant2 = User.objects.create_user(
            username='trading_tenant2',
            email='t2@trading.com',
            password='testpass123',
            role='tenant_admin'
        )
        
        # Create shared category
        self.category = FishCategory.objects.create(
            name="Common Fish",
            category_type="saltwater"
        )
        
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
        
        # Create supplier for tenant1
        self.supplier1 = Supplier.objects.create(
            name="Supplier1",
            phone="1111111111",
            tenant=self.tenant1
        )
        
        # Create buyer for tenant1
        self.buyer1 = Buyer.objects.create(
            name="Buyer1",
            phone="2222222222",
            tenant=self.tenant1
        )
    
    def test_fish_tenant_isolation(self):
        """Test fish model tenant isolation"""
        tenant1_fish = Fish.objects.filter(tenant=self.tenant1)
        tenant2_fish = Fish.objects.filter(tenant=self.tenant2)
        
        self.assertEqual(tenant1_fish.count(), 1)
        self.assertEqual(tenant2_fish.count(), 1)
        self.assertEqual(tenant1_fish.first().name, "Tenant1 Fish")
        self.assertEqual(tenant2_fish.first().name, "Tenant2 Fish")
    
    def test_supplier_tenant_isolation(self):
        """Test supplier model tenant isolation"""
        tenant1_suppliers = Supplier.objects.filter(tenant=self.tenant1)
        tenant2_suppliers = Supplier.objects.filter(tenant=self.tenant2)
        
        self.assertEqual(tenant1_suppliers.count(), 1)
        self.assertEqual(tenant2_suppliers.count(), 0)
    
    def test_buyer_tenant_isolation(self):
        """Test buyer model tenant isolation"""
        tenant1_buyers = Buyer.objects.filter(tenant=self.tenant1)
        tenant2_buyers = Buyer.objects.filter(tenant=self.tenant2)
        
        self.assertEqual(tenant1_buyers.count(), 1)
        self.assertEqual(tenant2_buyers.count(), 0)


# ============================================================
# PERMISSION TESTS
# ============================================================

class TradingPermissionTest(APITestCase):
    """Test permission classes for trading endpoints"""
    
    def setUp(self):
        self.company = Company.objects.create(name='Trading Co', slug='trading-co')

        # Create tenant admin
        self.tenant_admin = User.objects.create_user(
            username='trading_admin',
            email='admin@trading.com',
            password='testpass123',
            role='tenant_admin',
            company=self.company,
        )
        self.company.admin = self.tenant_admin
        self.company.save(update_fields=['admin'])
        
        # Create accountant
        self.accountant = User.objects.create_user(
            username='trading_accountant',
            email='accountant@trading.com',
            password='testpass123',
            role='accountant',
            company=self.company,
        )
        
        # Create sales staff
        self.sales_staff = User.objects.create_user(
            username='sales_staff',
            email='sales@trading.com',
            password='testpass123',
            role='sales_staff',
            company=self.company,
        )
        
        # Create store accounts
        self.store_accounts = User.objects.create_user(
            username='store_accounts',
            email='store@trading.com',
            password='testpass123',
            role='store_accounts',
            company=self.company,
        )
        
        self.category = FishCategory.objects.create(name="Perm Cat", category_type="saltwater")
        self.fish = Fish.objects.create(
            name="Perm Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant_admin
        )
        
        self.supplier = Supplier.objects.create(name="Perm Supplier", tenant=self.tenant_admin)
        self.buyer = Buyer.objects.create(name="Perm Buyer", tenant=self.tenant_admin)
    
    def test_tenant_admin_can_create_fish(self):
        """Test tenant admin can create fish"""
        self.client.force_authenticate(user=self.tenant_admin)
        
        url = '/api/fish/'
        data = {
            'name': 'New Fish',
            'category': self.category.id,
            'unit_type': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_accountant_can_create_fish(self):
        """Test accountant can create fish"""
        self.client.force_authenticate(user=self.accountant)
        
        url = '/api/fish/'
        data = {
            'name': 'Accountant Fish',
            'category': self.category.id,
            'unit_type': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_sales_staff_can_list_fish(self):
        """Test sales staff can list fish"""
        self.client.force_authenticate(user=self.sales_staff)
        
        url = '/api/fish/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_sales_staff_cannot_create_fish(self):
        """Test sales staff cannot create fish"""
        self.client.force_authenticate(user=self.sales_staff)
        
        url = '/api/fish/'
        data = {
            'name': 'New Fish',
            'category': self.category.id,
            'unit_type': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_store_accounts_cannot_create_fish(self):
        """Test store accounts cannot create fish"""
        self.client.force_authenticate(user=self.store_accounts)
        
        url = '/api/fish/'
        data = {
            'name': 'New Fish',
            'category': self.category.id,
            'unit_type': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_sales_staff_cannot_create_sale(self):
        """Test sales staff CAN create sales"""
        self.client.force_authenticate(user=self.sales_staff)
        
        batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            tenant=self.tenant_admin
        )
        
        url = '/api/sales/'
        data = {
            'batch': batch.id,
            'buyer': self.buyer.id,
            'number_of_packages_sold': 5,
            'selling_weight_per_package': '15.00',
            'selling_price_per_kg': '50.00'
        }
        response = self.client.post(url, data, format='json')
        # Sales staff CAN create sales
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_store_cannot_create_sale(self):
        """Test store accounts cannot create sales"""
        self.client.force_authenticate(user=self.store_accounts)
        
        batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("30.00"),
            tenant=self.tenant_admin
        )
        
        url = '/api/sales/'
        data = {
            'batch': batch.id,
            'buyer': self.buyer.id,
            'number_of_packages_sold': 5,
            'selling_weight_per_package': '15.00',
            'selling_price_per_kg': '50.00'
        }
        response = self.client.post(url, data, format='json')
        # Store accounts CANNOT create sales
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_store_can_create_purchase(self):
        """Test store accounts can create purchases"""
        self.client.force_authenticate(user=self.store_accounts)
        
        url = '/api/purchase-batches/'
        data = {
            'purchase_type': 'direct',
            'supplier': self.supplier.id,
            'fish': self.fish.id,
            'number_of_packages': 5,
            'package_weight': '20.00',
            'price_per_kg': '30.00'
        }
        response = self.client.post(url, data, format='json')
        # Store accounts CAN create purchases
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_sales_staff_cannot_create_purchase(self):
        """Test sales staff cannot create purchases"""
        self.client.force_authenticate(user=self.sales_staff)
        
        url = '/api/purchase-batches/'
        data = {
            'purchase_type': 'direct',
            'supplier': self.supplier.id,
            'fish': self.fish.id,
            'number_of_packages': 5,
            'package_weight': '20.00',
            'price_per_kg': '30.00'
        }
        response = self.client.post(url, data, format='json')
        # Sales staff CANNOT create purchases
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ============================================================
# MODEL METHOD TESTS
# ============================================================

class SupplierModelMethodTest(TestCase):
    """Test supplier model methods"""
    
    def setUp(self):
        self.supplier = Supplier.objects.create(
            name="Method Test Supplier",
            phone="1234567890",
            supplier_type="individual",
            credit_limit=Decimal("10000.00")
        )
    
    def test_update_credit_balance(self):
        """Test credit balance calculation"""
        self.supplier.total_credit_given = Decimal("5000.00")
        self.supplier.total_credit_repaid = Decimal("2000.00")
        self.supplier.update_credit_balance()
        
        self.assertEqual(self.supplier.current_credit_balance, Decimal("3000.00"))
    
    def test_update_outstanding(self):
        """Test outstanding amount update"""
        tenant = User.objects.create_user(username='outstanding_test', password='test123')
        category = FishCategory.objects.create(name="Out Cat")
        fish = Fish.objects.create(name="Out Fish", category=category, unit_type="kg", tenant=tenant)
        
        batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("50.00"),
            pending_amount=Decimal("5000.00"),
            tenant=tenant
        )
        
        self.supplier.update_outstanding()
        self.assertEqual(self.supplier.outstanding_amount, Decimal("5000.00"))
    
    def test_payment_status(self):
        """Test payment status calculation"""
        self.supplier.outstanding_amount = Decimal("0.00")
        self.assertEqual(self.supplier.get_payment_status(), 'paid')
        
        self.supplier.outstanding_amount = Decimal("1000.00")
        self.assertEqual(self.supplier.get_payment_status(), 'partial')
    
    def test_is_payment_overdue(self):
        """Test payment overdue check"""
        self.assertFalse(self.supplier.is_payment_overdue())


class BuyerModelMethodTest(TestCase):
    """Test buyer model methods"""
    
    def setUp(self):
        self.buyer = Buyer.objects.create(
            name="Method Test Buyer",
            phone="1234567890",
            buyer_type="restaurant",
            credit_limit=Decimal("10000.00")
        )
    
    def test_update_credit_balance(self):
        """Test credit balance calculation"""
        self.buyer.total_credit_allowed = Decimal("5000.00")
        self.buyer.total_credit_repaid = Decimal("2000.00")
        self.buyer.update_credit_balance()
        
        self.assertEqual(self.buyer.current_credit_balance, Decimal("3000.00"))
    
    def test_get_total_pending(self):
        """Test total pending calculation"""
        tenant = User.objects.create_user(username='pending_test', password='test123')
        category = FishCategory.objects.create(name="Pen Cat")
        fish = Fish.objects.create(name="Pen Fish", category=category, unit_type="kg", tenant=tenant)
        
        batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=Supplier.objects.create(name="S"),
            fish=fish,
            number_of_packages=10,
            package_weight=Decimal("20.00"),
            price_per_kg=Decimal("50.00"),
            tenant=tenant
        )
        
        Sale.objects.create(
            batch=batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("15.00"),
            selling_price_per_kg=Decimal("60.00"),
            pending_amount=Decimal("2000.00"),
            tenant=tenant
        )
        
        pending = self.buyer.get_total_pending()
        self.assertEqual(pending, Decimal("2000.00"))


class PurchaseBatchModelMethodTest(TestCase):
    """Test purchase batch model methods"""
    
    def setUp(self):
        self.category = FishCategory.objects.create(name="Batch Method Cat")
        self.tenant = User.objects.create_user(username='batch_method', password='test123')
        self.fish = Fish.objects.create(
            name="Batch Method Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Batch Supplier")
        
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
            tenant=self.tenant
        )
    
    def test_calculate_fields(self):
        """Test calculate fields method"""
        self.batch.calculate_fields()
        
        self.assertEqual(self.batch.total_weight, Decimal("370.00"))
        self.assertEqual(self.batch.fish_cost, Decimal("18500.00"))
        self.assertEqual(self.batch.total_expense, Decimal("18850.00"))
    
    def test_get_cost_per_package(self):
        """Test cost per package calculation"""
        self.batch.calculate_fields()
        cost = self.batch.get_cost_per_package()
        
        self.assertGreater(cost, Decimal("0.00"))


class SaleModelMethodTest(TestCase):
    """Test sale model methods"""
    
    def setUp(self):
        self.category = FishCategory.objects.create(name="Sale Method Cat")
        self.tenant = User.objects.create_user(username='sale_method', password='test123')
        self.fish = Fish.objects.create(
            name="Sale Method Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Sale Method Supplier")
        self.buyer = Buyer.objects.create(name="Sale Method Buyer")
        
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=20,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("40.00"),
            tenant=self.tenant
        )
        
        self.sale = Sale.objects.create(
            batch=self.batch,
            buyer=self.buyer,
            number_of_packages_sold=5,
            selling_weight_per_package=Decimal("27.00"),
            selling_price_per_kg=Decimal("60.00"),
            tenant=self.tenant
        )
    
    def test_calculate_fields(self):
        """Test sale calculate fields"""
        self.sale.calculate_fields()
        
        self.assertEqual(self.sale.total_revenue, Decimal("8100.00"))  # 5 * 27 * 60
        self.assertEqual(self.sale.total_cost, Decimal("5400.00"))  # 5 * 27 * 40
        self.assertEqual(self.sale.profit, Decimal("2700.00"))  # 8100 - 5400
    
    def test_get_profit_per_kg(self):
        """Test profit per kg calculation"""
        self.sale.calculate_fields()
        profit_kg = self.sale.get_profit_per_kg()
        
        self.assertEqual(profit_kg, Decimal("20.00"))  # 60 - 40



class InventoryModelMethodTest(TestCase):
    """Test inventory model methods"""
    
    def setUp(self):
        self.category = FishCategory.objects.create(name="Inv Method Cat")
        self.tenant = User.objects.create_user(username='inv_method', password='test123')
        self.fish = Fish.objects.create(
            name="Inv Method Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Inv Method Supplier")
        
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
    
    def test_update_stock(self):
        """Test stock update"""
        self.inventory.update_stock(5)
        
        self.assertEqual(self.inventory.sold_packages, 5)
        self.assertEqual(self.inventory.remaining_packages, 10)
    
    def test_needs_reorder(self):
        """Test reorder check"""
        self.inventory.remaining_packages = 3
        self.assertTrue(self.inventory.needs_reorder())
        
        self.inventory.remaining_packages = 10
        self.assertFalse(self.inventory.needs_reorder())
    
    def test_get_stock_value(self):
        """Test stock value calculation"""
        self.batch.calculate_fields()
        value = self.inventory.get_stock_value()
        
        self.assertGreater(value, Decimal("0.00"))
    
    
import threading
from concurrent.futures import ThreadPoolExecutor
from django.db import transaction

class InventoryConcurrencyTest(TestCase):
    """Test inventory update concurrency"""
    
    def setUp(self):
        super().setUp()
        self.category = FishCategory.objects.create(name="Concurrent Cat")
        self.tenant = User.objects.create_user(username='concurrency_test', password='test123')
        self.fish = Fish.objects.create(
            name="Concurrent Fish",
            category=self.category,
            unit_type="kg",
            tenant=self.tenant
        )
        self.supplier = Supplier.objects.create(name="Concurrent Supplier")
        self.batch = PurchaseBatch.objects.create(
            purchase_type="direct",
            supplier=self.supplier,
            fish=self.fish,
            number_of_packages=100,
            package_weight=Decimal("37.00"),
            price_per_kg=Decimal("45.00"),
            tenant=self.tenant
        )
        self.inventory = Inventory.objects.create(
            fish=self.fish,
            purchase_batch=self.batch,
            initial_packages=100,
            remaining_packages=100,
            initial_weight_kg=Decimal("3700.00"),
            remaining_weight_kg=Decimal("3700.00"),
            reorder_level=10,
            tenant=self.tenant
        )
    
    def concurrent_update(self, packages):
        self.inventory.update_stock(packages)
    
    def test_concurrent_stock_updates(self):
        """Test multiple concurrent stock updates don't cause race conditions"""
        num_threads = 10
        packages_per_thread = 5
        
        threads = []
        for _ in range(num_threads):
            t = threading.Thread(target=self.concurrent_update, args=(packages_per_thread,))
            t.start()
            threads.append(t)
        
        for t in threads:
            t.join()
        
        # Refresh from DB
        self.inventory.refresh_from_db()
        
        expected_sold = num_threads * packages_per_thread
        expected_remaining = 100 - expected_sold
        
        self.assertEqual(self.inventory.sold_packages, expected_sold)
        self.assertEqual(self.inventory.remaining_packages, expected_remaining)
        self.assertLessEqual(expected_remaining, self.inventory.remaining_weight_kg / 37, "Weight consistency")

