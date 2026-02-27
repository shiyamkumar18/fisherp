from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserLoginTestCase(TestCase):
    """Test cases for user login with different roles"""
    
    def setUp(self):
        """Set up test clients and users"""
        self.client = APIClient()
        
        # Create Admin User (Platform Maintainer / Superuser)
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@fishapp.com',
            password='admin123',
            schema_name='public',
            role='platform_maintainer'
        )
        
        # Create Trader User (Regular user)
        self.trader_user = User.objects.create_user(
            username='trader',
            email='trader@fishapp.com',
            password='trader123',
            schema_name='trader',
            role='tenant_admin'
        )
        
        # Create Tenant Admin User
        self.tenant_admin = User.objects.create_user(
            username='tenant_admin',
            email='tenant_admin@fishapp.com',
            password='tenant123',
            schema_name='tenant_admin',
            role='tenant_admin'
        )
        
        # Create Sales Staff User
        self.sales_staff = User.objects.create_user(
            username='sales_staff',
            email='sales@fishapp.com',
            password='sales123',
            schema_name='trader',  # Same schema as trader
            role='sales_staff'
        )
        
        # Create Store/Accounts User
        self.store_accounts = User.objects.create_user(
            username='store_accounts',
            email='store@fishapp.com',
            password='store123',
            schema_name='trader',  # Same schema as trader
            role='store_accounts'
        )
    
    # ==================== Admin (Platform Maintainer) Tests ====================
    
    def test_admin_login_success(self):
        """Test successful admin login returns correct role and permissions"""
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'admin123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['username'], 'admin')
        self.assertEqual(response.data['role'], 'platform_maintainer')
        self.assertTrue(response.data['is_platform_maintainer'])
        self.assertTrue(response.data['is_tenant_admin'])
        self.assertEqual(response.data['schema_name'], 'public')
    
    def test_admin_login_returns_all_permissions(self):
        """Test admin user gets all permission flags"""
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'admin123'
        })
        
        self.assertTrue(response.data['is_platform_maintainer'])
        self.assertTrue(response.data['is_tenant_admin'])
        self.assertFalse(response.data['is_sales_staff'])
        self.assertFalse(response.data['is_store_accounts'])
    
    # ==================== Trader Login Tests ====================
    
    def test_trader_login_success(self):
        """Test successful trader login returns correct role"""
        response = self.client.post('/api/auth/login/', {
            'username': 'trader',
            'password': 'trader123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['username'], 'trader')
        self.assertEqual(response.data['role'], 'tenant_admin')
        self.assertTrue(response.data['is_tenant_admin'])
        self.assertEqual(response.data['schema_name'], 'trader')
    
    def test_trader_login_invalid_password(self):
        """Test trader login fails with wrong password"""
        response = self.client.post('/api/auth/login/', {
            'username': 'trader',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
    
    def test_trader_login_nonexistent_user(self):
        """Test login fails for nonexistent user"""
        response = self.client.post('/api/auth/login/', {
            'username': 'nonexistent',
            'password': 'anypassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    # ==================== Tenant Admin Login Tests ====================
    
    def test_tenant_admin_login_success(self):
        """Test successful tenant_admin login returns correct role"""
        response = self.client.post('/api/auth/login/', {
            'username': 'tenant_admin',
            'password': 'tenant123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'tenant_admin')
        self.assertEqual(response.data['role'], 'tenant_admin')
        self.assertTrue(response.data['is_tenant_admin'])
        self.assertFalse(response.data['is_platform_maintainer'])
        self.assertEqual(response.data['schema_name'], 'tenant_admin')
    
    def test_tenant_admin_login_returns_role_display(self):
        """Test tenant_admin login returns human-readable role"""
        response = self.client.post('/api/auth/login/', {
            'username': 'tenant_admin',
            'password': 'tenant123'
        })
        
        self.assertIn('role_display', response.data)
        self.assertEqual(response.data['role_display'], 'Tenant Admin')
    
    # ==================== Sales Staff Login Tests ====================
    
    def test_sales_staff_login_success(self):
        """Test successful sales_staff login returns correct role"""
        response = self.client.post('/api/auth/login/', {
            'username': 'sales_staff',
            'password': 'sales123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'sales_staff')
        self.assertEqual(response.data['role'], 'sales_staff')
        self.assertTrue(response.data['is_sales_staff'])
        self.assertFalse(response.data['is_tenant_admin'])
        self.assertFalse(response.data['is_store_accounts'])
    
    def test_sales_staff_cannot_list_users(self):
        """Test sales_staff cannot access tenant user management"""
        # First login as sales_staff
        login_response = self.client.post('/api/auth/login/', {
            'username': 'sales_staff',
            'password': 'sales123'
        })
        
        access_token = login_response.data['access']
        
        # Try to access tenant users (should fail)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/auth/tenant-users/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    # ==================== Store/Accounts Login Tests ====================
    
    def test_store_accounts_login_success(self):
        """Test successful store_accounts login returns correct role"""
        response = self.client.post('/api/auth/login/', {
            'username': 'store_accounts',
            'password': 'store123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'store_accounts')
        self.assertEqual(response.data['role'], 'store_accounts')
        self.assertTrue(response.data['is_store_accounts'])
        self.assertFalse(response.data['is_tenant_admin'])
        self.assertFalse(response.data['is_sales_staff'])
    
    def test_store_accounts_cannot_create_users(self):
        """Test store_accounts cannot access tenant user management"""
        # First login as store_accounts
        login_response = self.client.post('/api/auth/login/', {
            'username': 'store_accounts',
            'password': 'store123'
        })
        
        access_token = login_response.data['access']
        
        # Try to access tenant users (should fail)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/auth/tenant-users/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    # ==================== Login Edge Cases ====================
    
    def test_login_missing_username(self):
        """Test login fails when username is missing"""
        response = self.client.post('/api/auth/login/', {
            'password': 'admin123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_missing_password(self):
        """Test login fails when password is missing"""
        response = self.client.post('/api/auth/login/', {
            'username': 'admin'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_inactive_user(self):
        """Test login fails for inactive user"""
        # Create inactive user
        inactive_user = User.objects.create_user(
            username='inactive',
            email='inactive@fishapp.com',
            password='inactive123',
            schema_name='test',
            is_active=False
        )
        
        response = self.client.post('/api/auth/login/', {
            'username': 'inactive',
            'password': 'inactive123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_login_with_email(self):
        """Test login works with email address"""
        response = self.client.post('/api/auth/login/', {
            'email': 'admin@fishapp.com',
            'password': 'admin123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin')
    
    def test_all_user_types_can_login(self):
        """Test all user types can successfully login"""
        user_types = [
            ('admin', 'admin123', 'platform_maintainer'),
            ('trader', 'trader123', 'tenant_admin'),
            ('tenant_admin', 'tenant123', 'tenant_admin'),
            ('sales_staff', 'sales123', 'sales_staff'),
            ('store_accounts', 'store123', 'store_accounts'),
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
            self.assertIn('access', response.data)


class TenantIsolationTestCase(TestCase):
    """Test cases for user/tenant login and tenant isolation"""
    
    def setUp(self):
        """Set up test clients and users"""
        self.client = APIClient()
        
        # Create user for Tenant 1
        self.user_tenant1 = User.objects.create_user(
            username='tenant1_user',
            password='testpass123',
            email='tenant1@example.com',
            schema_name='tenant1',
            role='tenant_admin'
        )
        
        # Create user for Tenant 2
        self.user_tenant2 = User.objects.create_user(
            username='tenant2_user',
            password='testpass123',
            email='tenant2@example.com',
            schema_name='tenant2',
            role='tenant_admin'
        )
    
    def test_user_login_success(self):
        """Test successful user login returns JWT tokens"""
        response = self.client.post('/api/auth/login/', {
            'username': 'tenant1_user',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['username'], 'tenant1_user')
        self.assertEqual(response.data['schema_name'], 'tenant1')
    
    def test_user_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = self.client.post('/api/auth/login/', {
            'username': 'tenant1_user',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
    
    def test_user_login_missing_credentials(self):
        """Test login fails when credentials are missing"""
        response = self.client.post('/api/auth/login/', {
            'username': 'tenant1_user',
            # password is missing
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_tenant_isolation_login(self):
        """Test that different tenants can login and have different schema_names"""
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
        self.assertNotEqual(response1.data['schema_name'], response2.data['schema_name'])
    
    def test_tenant_isolation_with_authenticated_requests(self):
        """Test tenant isolation with authenticated API requests"""
        # Login as tenant1 user
        response = self.client.post('/api/auth/login/', {
            'username': 'tenant1_user',
            'password': 'testpass123'
        })
        
        access_token = response.data['access']
        
        # Make authenticated request
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        profile_response = self.client.get('/api/auth/profile/')
        
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data['schema_name'], 'tenant1')
    
    def test_user_registration_creates_tenant(self):
        """Test user registration creates user with unique tenant schema"""
        response = self.client.post('/api/auth/register/', {
            'company_name': 'New Company',
            'email': 'newtenant@example.com',
            'password': 'newpass123',
            'confirm_password': 'newpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('schema_name', response.data)
        self.assertIn('access', response.data)


class UserRegistrationTestCase(TestCase):
    """Test cases for user registration"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_user_registration_success(self):
        """Test successful user registration"""
        response = self.client.post('/api/auth/register/', {
            'company_name': 'Test Company',
            'email': 'newuser@example.com',
            'password': 'Testpass123!',
            'confirm_password': 'Testpass123!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('access', response.data)
    
    def test_user_registration_duplicate_email(self):
        """Test registration fails with duplicate email"""
        # Create existing user
        User.objects.create_user(
            username='existing',
            email='existing@example.com',
            password='testpass123'
        )
        
        response = self.client.post('/api/auth/register/', {
            'company_name': 'Test Company',
            'email': 'existing@example.com',
            'password': 'Testpass123!',
            'confirm_password': 'Testpass123!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_user_registration_missing_fields(self):
        """Test registration fails with missing required fields"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com'
            # company_name and password are missing
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_registration_password_mismatch(self):
        """Test registration fails when passwords don't match"""
        response = self.client.post('/api/auth/register/', {
            'company_name': 'Test Company',
            'email': 'newuser@example.com',
            'password': 'Testpass123!',
            'confirm_password': 'Differentpass123!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_registration_weak_password(self):
        """Test registration fails with weak password"""
        response = self.client.post('/api/auth/register/', {
            'company_name': 'Test Company',
            'email': 'newuser@example.com',
            'password': 'weak',
            'confirm_password': 'weak'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
