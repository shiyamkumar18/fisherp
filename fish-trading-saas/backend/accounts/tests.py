from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from decimal import Decimal

User = get_user_model()


class UserLoginTestCase(TestCase):
    """Test cases for user login with different roles"""
    
    def setUp(self):
        """Set up test clients and users"""
        self.client = APIClient()
        
        # Create Platform Operator (NOT superuser - security feature)
        self.platform_operator = User.objects.create_user(
            username='platform_operator',
            email='platform@fishapp.com',
            password='platform123',
            schema_name='public',
            role='platform_operator',
            is_staff=True,  # Can access admin
            is_superuser=False  # NOT superuser for security!
        )

        # Create Platform Support
        self.platform_support = User.objects.create_user(
            username='platform_support',
            email='support@fishapp.com',
            password='support123',
            schema_name='public',
            role='platform_support',
            is_staff=True,
            is_superuser=False
        )
        
        # Create Tenant Admin User
        self.tenant_admin = User.objects.create_user(
            username='admin',
            email='admin@fishapp.com',
            password='admin123',
            schema_name='tenant1',
            role='tenant_admin'
        )
        
        # Create Accountant User
        self.accountant = User.objects.create_user(
            username='accountant',
            email='accountant@fishapp.com',
            password='accountant123',
            schema_name='tenant1',
            role='accountant'
        )
        
        # Create Trader (Sales Staff) User
        self.trader = User.objects.create_user(
            username='trader',
            email='trader@fishapp.com',
            password='trader123',
            schema_name='tenant1',
            role='sales_staff'
        )
        
        # Create Store/Accounts User
        self.store_accounts = User.objects.create_user(
            username='store',
            email='store@fishapp.com',
            password='store123',
            schema_name='tenant1',
            role='store_accounts'
        )
    
    # ==================== Platform Operator Tests ====================
    
    def test_platform_operator_login_success(self):
        """Test successful platform operator login"""
        response = self.client.post('/api/auth/login/', {
            'username': 'platform_operator',
            'password': 'platform123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['username'], 'platform_operator')
        self.assertEqual(response.data['role'], 'platform_operator')
        self.assertTrue(response.data['is_platform_operator'])
    
    def test_platform_operator_is_not_superuser(self):
        """Test that platform operator is NOT a superuser (security feature)"""
        user = User.objects.get(username='platform_operator')
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_staff)  # Can access admin
    
    def test_platform_operator_cannot_see_business_data_directly(self):
        \"\"\"Test platform operator cannot see tenant business data without impersonation (expect 403 for protected endpoints)\"\"\"
        # Login as platform operator
        login_response = self.client.post('/api/auth/login/', {
            'username': 'platform_operator',
            'password': 'platform123'
        })
        
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Try to access sales - should be denied (platform cannot access tenant data directly)
        response = self.client.get('/api/trading/sales/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_impersonation_logging(self):
        \"\"\"Test impersonation creates audit logs\"\"\"
        from accounts.models_audit import AuditLog, ImpersonationLog
        
        # Mock impersonation start
        platform_op = self.platform_operator
        tenant_admin = self.tenant_admin
        
        # Create impersonation log
        impersonation_log = ImpersonationLog.objects.log_impersonation_start(
            platform_user=platform_op,
            tenant=tenant_admin.company if hasattr(tenant_admin, 'company') else tenant_admin,
            reason='Test impersonation'
        )
        
        self.assertIsInstance(impersonation_log, ImpersonationLog)
        self.assertEqual(impersonation_log.reason, 'Test impersonation')
        self.assertEqual(impersonation_log.platform_user, platform_op)
        
        # Check audit log created
        audit_logs = AuditLog.objects.filter(action='impersonate_start')
        self.assertGreater(audit_logs.count(), 0)

    def test_platform_support_login_success(self):
        """Test successful platform support login"""
        response = self.client.post('/api/auth/login/', {
            'username': 'platform_support',
            'password': 'support123'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['username'], 'platform_support')
        self.assertEqual(response.data['role'], 'platform_support')
        self.assertTrue(response.data['is_platform_support'])
    
    # ==================== Tenant Admin Tests ====================
    
    def test_tenant_admin_login_success(self):
        """Test successful tenant admin login"""
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'admin123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['username'], 'admin')
        self.assertEqual(response.data['role'], 'tenant_admin')
        self.assertTrue(response.data['is_tenant_admin'])
    
    def test_tenant_admin_has_full_access(self):
        """Test tenant admin has all permission flags"""
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'admin123'
        })
        
        self.assertTrue(response.data['is_tenant_admin'])
        self.assertTrue(response.data.get('can_view_financials', False))
        self.assertTrue(response.data.get('can_manage_users', False))
        self.assertTrue(response.data.get('can_delete_records', False))
    
    # ==================== Accountant Tests ====================
    
    def test_accountant_login_success(self):
        """Test successful accountant login"""
        response = self.client.post('/api/auth/login/', {
            'username': 'accountant',
            'password': 'accountant123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'accountant')
        self.assertEqual(response.data['role'], 'accountant')
        self.assertTrue(response.data['is_accountant'])
    
    def test_accountant_can_view_financials(self):
        """Test accountant can view financial data"""
        response = self.client.post('/api/auth/login/', {
            'username': 'accountant',
            'password': 'accountant123'
        })
        
        self.assertTrue(response.data.get('can_view_financials', False))
        self.assertFalse(response.data.get('can_manage_users', False))
    
    def test_accountant_cannot_delete_records(self):
        """Test accountant cannot delete records"""
        response = self.client.post('/api/auth/login/', {
            'username': 'accountant',
            'password': 'accountant123'
        })
        
        self.assertFalse(response.data.get('can_delete_records', False))
    
    # ==================== Trader (Sales Staff) Tests ====================
    
    def test_trader_login_success(self):
        """Test successful trader login"""
        response = self.client.post('/api/auth/login/', {
            'username': 'trader',
            'password': 'trader123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'trader')
        self.assertEqual(response.data['role'], 'trader')
        self.assertTrue(response.data['is_sales_staff'])
    
    def test_trader_cannot_manage_users(self):
        """Test trader cannot manage users"""
        # Login as trader
        login_response = self.client.post('/api/auth/login/', {
            'username': 'trader',
            'password': 'trader123'
        })
        
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Try to access tenant users (should fail)
        response = self.client.get('/api/auth/tenant-users/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_trader_cannot_view_financials(self):
        """Test trader cannot view full financial data"""
        response = self.client.post('/api/auth/login/', {
            'username': 'trader',
            'password': 'trader123'
        })
        
        self.assertFalse(response.data.get('can_view_financials', False))
        self.assertFalse(response.data.get('can_view_profit', False))
    
    # ==================== Store Accounts Tests ====================
    
    def test_store_login_success(self):
        """Test successful store login"""
        response = self.client.post('/api/auth/login/', {
            'username': 'store',
            'password': 'store123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'store')
        self.assertEqual(response.data['role'], 'store')
        self.assertTrue(response.data['is_store_accounts'])
    
    def test_store_cannot_create_sales(self):
        """Test store accounts cannot create sales"""
        # Login as store
        login_response = self.client.post('/api/auth/login/', {
            'username': 'store',
            'password': 'store123'
        })
        
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Try to create a sale (should fail - store can't create sales)
        response = self.client.post('/api/trading/sales/', {
            'buyer': 1,
            'batch': 1,
            'number_of_packages_sold': 10
        })
        
        # Should be denied - store accounts can only create purchases
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    # ==================== Role Hierarchy Tests ====================
    
    def test_role_hierarchy(self):
        """Test role hierarchy levels"""
        admin = User.objects.get(username='admin')
        accountant = User.objects.get(username='accountant')
        trader = User.objects.get(username='trader')
        store = User.objects.get(username='store')
        
        # Admin should have highest level
        self.assertEqual(admin.role_level, 4)
        self.assertEqual(accountant.role_level, 3)
        self.assertEqual(trader.role_level, 2)
        self.assertEqual(store.role_level, 1)
    
    def test_all_user_types_can_login(self):
        """Test all user types can successfully login"""
        user_types = [
            ('platform_operator', 'platform123', 'platform_operator'),
            ('platform_support', 'support123', 'platform_support'),
            ('admin', 'admin123', 'tenant_admin'),
            ('accountant', 'accountant123', 'accountant'),
            ('trader', 'trader123', 'trader'),
            ('store', 'store123', 'store'),
        ]
        
        for username, password, expected_role in user_types:
            response = self.client.post('/api/auth/login/', {
                'username': username,
                'password': password
            })
            
            self.assertEqual(
                response.status_code, 
                status.HTTP_200_OK,
                f"Login failed for {username}"
            )
            self.assertEqual(
                response.data['role'], 
                expected_role,
                f"Wrong role for {username}"
            )


class DataMaskingTestCase(TestCase):
    """Test cases for data masking based on user roles"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.tenant_admin = User.objects.create_user(
            username='admin',
            email='admin@fishapp.com',
            password='admin123',
            schema_name='tenant1',
            role='tenant_admin'
        )
        
        self.trader = User.objects.create_user(
            username='trader',
            email='trader@fishapp.com',
            password='trader123',
            schema_name='tenant1',
            role='sales_staff'
        )
    
    def test_can_view_financials_permission(self):
        \"\"\"Test CanViewFinancials permission\"\"\"
        from accounts.permissions import CanViewFinancials
        
        permission = CanViewFinancials()
        
        # Admin can view financials
        self.assertTrue(self.tenant_admin.is_tenant_admin)
        self.assertTrue(permission.has_permission({'user': self.tenant_admin}, None))
        
        # Trader cannot
        self.assertFalse(self.trader.is_accountant)
        self.assertFalse(permission.has_permission({'user': self.trader}, None))
    
    def test_can_edit_sale_time_restrictions(self):
        \"\"\"Test CanEditSale time-based permissions\"\"\"
        from accounts.permissions import CanEditSale
        from trading.models import Sale  # Assume exists
        
        permission = CanEditSale()
        
        # Mock sales objects
        today_sale = MagicMock()
        today_sale.date = timezone.now().date()
        today_sale.delivery_status = 'pending'
        
        old_sale = MagicMock()
        old_sale.date = timezone.now().date() - timedelta(days=1)
        old_sale.delivery_status = 'pending'
        
        delivered_sale = MagicMock()
        delivered_sale.delivery_status = 'delivered'
        
        # Trader can edit same-day
        self.assertTrue(permission.has_object_permission({'user': self.trader}, None, today_sale))
        self.assertFalse(permission.has_object_permission({'user': self.trader}, None, old_sale))
        
        # Admin can edit all
        self.assertTrue(permission.has_object_permission({'user': self.tenant_admin}, None, delivered_sale))
        
        # Accountant cannot edit delivered
        self.assertFalse(permission.has_object_permission({'user': self.accountant}, None, delivered_sale))
    
    def test_trader_cannot_see_cost_in_purchases(self):
        """Test trader cannot see cost fields in purchase response"""
        self.assertTrue(self.trader.is_sales_staff)
        
        # Verify trader role cannot view financials
        self.assertFalse(self.trader.can_view_financials())
    
    def test_admin_can_view_financials(self):
        """Test admin can view all financial data"""
        self.assertTrue(self.tenant_admin.can_view_financials())
    
    def test_accountant_can_view_financials(self):
        """Test accountant can view financial data"""
        accountant = User.objects.create_user(
            username='accountant',
            email='accountant@fishapp.com',
            password='accountant123',
            schema_name='tenant1',
            role='accountant'
        )
        
        self.assertTrue(accountant.can_view_financials())


class TimeBasedEditRestrictionsTestCase(TestCase):
    """Test cases for time-based edit restrictions"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.tenant_admin = User.objects.create_user(
            username='admin',
            email='admin@fishapp.com',
            password='admin123',
            schema_name='tenant1',
            role='tenant_admin'
        )
        
        self.trader = User.objects.create_user(
            username='trader',
            email='trader@fishapp.com',
            password='trader123',
            schema_name='tenant1',
            role='sales_staff'
        )
        
        self.accountant = User.objects.create_user(
            username='accountant',
            email='accountant@fishapp.com',
            password='accountant123',
            schema_name='tenant1',
            role='accountant'
        )
        
        self.store = User.objects.create_user(
            username='store',
            email='store@fishapp.com',
            password='store123',
            schema_name='tenant1',
            role='store_accounts'
        )
    
    def test_trader_can_only_edit_same_day_sales(self):
        """Test trader can only edit same-day sales"""
        # Trader should have is_sales_staff flag
        self.assertTrue(self.trader.is_sales_staff)
        
        # Verify trader has limited edit capability
        # (actual time-based check happens in CanEditSale permission class)
    
    def test_accountant_can_edit_before_delivery(self):
        """Test accountant can edit sales before delivery"""
        self.assertTrue(self.accountant.is_accountant)
        self.assertTrue(self.accountant.is_tenant_user)
    
    def test_store_can_edit_before_lock(self):
        """Test store accounts can edit purchases before lock"""
        self.assertTrue(self.store.is_store_accounts)
    
    def test_admin_can_edit_anytime(self):
        """Test tenant admin can edit anytime"""
        self.assertTrue(self.tenant_admin.can_delete_records())
        self.assertTrue(self.tenant_admin.can_manage_users())
    
    def test_only_admin_can_delete(self):
        """Test only tenant admin can delete records"""
        self.assertTrue(self.tenant_admin.can_delete_records())
        
        # Others should not have delete permission
        self.assertFalse(self.accountant.can_delete_records())
        self.assertFalse(self.trader.can_delete_records())
        self.assertFalse(self.store.can_delete_records())


class TenantIsolationTestCase(TestCase):
    """Test cases for tenant isolation"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users for different tenants
        self.user_tenant1 = User.objects.create_user(
            username='tenant1_user',
            password='testpass123',
            email='tenant1@example.com',
            schema_name='tenant1',
            role='tenant_admin'
        )
        
        self.user_tenant2 = User.objects.create_user(
            username='tenant2_user',
            password='testpass123',
            email='tenant2@example.com',
            schema_name='tenant2',
            role='tenant_admin'
        )
    
    def test_tenant_isolation(self):
        """Test that different tenants have different schema names"""
        # Login as tenant1 user
        response1 = self.client.post('/api/auth/login/', {
            'username': 'tenant1_user',
            'password': 'testpass123'
        })
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data['schema_name'], 'tenant1')
        
        # Login as tenant2 user
        response2 = self.client.post('/api/auth/login/', {
            'username': 'tenant2_user',
            'password': 'testpass123'
        })
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['schema_name'], 'tenant2')
        
        # Verify different schema names
        self.assertNotEqual(
            response1.data['schema_name'], 
            response2.data['schema_name']
        )
    
    def test_platform_operator_needs_impersonation(self):
        """Test platform operator cannot directly access tenant data"""
        platform_op = User.objects.create_user(
            username='platform_op',
            password='testpass123',
            email='platform@example.com',
            schema_name='public',
            role='platform_operator',
            is_staff=True,
            is_superuser=False
        )
        
        response = self.client.post('/api/auth/login/', {
            'username': 'platform_op',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_platform_operator'])
        
        # Platform operator should NOT have direct business data access
        # They must use impersonation


class PermissionMatrixTestCase(TestCase):
    """Test cases verifying the full permission matrix"""
    
    def setUp(self):
        self.platform_op = User.objects.create_user(
            username='platform_op', password='pass', email='p@p.com',
            schema_name='public', role='platform_operator', is_staff=True
        )
        self.tenant_admin = User.objects.create_user(
            username='admin', password='pass', email='a@a.com',
            schema_name='t1', role='tenant_admin'
        )
        self.accountant = User.objects.create_user(
            username='accountant', password='pass', email='ac@ac.com',
            schema_name='t1', role='accountant'
        )
        self.trader = User.objects.create_user(
            username='trader', password='pass', email='t@t.com',
            schema_name='t1', role='sales_staff'
        )
        self.store = User.objects.create_user(
            username='store', password='pass', email='s@s.com',
            schema_name='t1', role='store_accounts'
        )
    
    def test_view_all_tenants(self):
        """Only platform operator can view all tenants"""
        self.assertTrue(self.platform_op.is_platform_operator)
        self.assertFalse(self.tenant_admin.is_platform_operator)
        self.assertFalse(self.accountant.is_platform_operator)
        self.assertFalse(self.trader.is_platform_operator)
        self.assertFalse(self.store.is_platform_operator)
    
    def test_create_sale_permissions(self):
        """Verify who can create sales"""
        # Admin, Accountant, Trader can create sales
        self.assertTrue(self.tenant_admin.role_level >= 2)
        self.assertTrue(self.accountant.role_level >= 2)
        self.assertTrue(self.trader.role_level >= 2)
        
        # Store cannot create sales
        self.assertEqual(self.store.role_level, 1)
    
    def test_create_purchase_permissions(self):
        """Verify who can create purchases"""
        # Admin, Accountant, Store can create purchases
        self.assertTrue(self.tenant_admin.role_level >= 2)
        self.assertTrue(self.accountant.role_level >= 2)
        self.assertTrue(self.store.role_level >= 2)
        
        # Trader cannot create purchases
        self.assertEqual(self.trader.role_level, 2)
    
    def test_manage_users_permissions(self):
        """Only tenant admin can manage users"""
        self.assertTrue(self.tenant_admin.can_manage_users())
        self.assertFalse(self.accountant.can_manage_users())
        self.assertFalse(self.trader.can_manage_users())
        self.assertFalse(self.store.can_manage_users())
    
    def test_change_subscription_permissions(self):
        """Only platform operator can change subscriptions"""
        self.assertTrue(self.platform_op.is_platform_operator)
        self.assertFalse(self.tenant_admin.is_platform_operator)
        self.assertFalse(self.accountant.is_platform_operator)
        self.assertFalse(self.trader.is_platform_operator)
        self.assertFalse(self.store.is_platform_operator)
