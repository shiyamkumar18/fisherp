from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from unittest.mock import patch

from subscriptions.models import Subscription, SubscriptionTier

User = get_user_model()


class SubscriptionTierModelTest(TestCase):
    """Test SubscriptionTier model"""
    
    def setUp(self):
        self.tier = SubscriptionTier.objects.create(
            name="premium",
            description="Premium plan with all features",
            max_users=10,
            max_storage_gb=50,
            price_monthly=Decimal("99.00"),
            price_yearly=Decimal("990.00"),
            allow_api_access=True,
            allow_analytics=True,
            allow_advanced_reporting=True,
            allow_multi_location=True,
            allow_custom_integrations=True,
            priority_support=True,
            max_purchases_per_month=1000,
            max_sales_per_month=2000,
            max_products=500,
            max_suppliers=100,
            max_buyers=200,
            trial_days=14,
            is_active=True,
            display_order=2,
            is_recommended=True
        )
    
    def test_tier_creation(self):
        """Test tier is created with all fields"""
        self.assertEqual(self.tier.name, "premium")
        self.assertEqual(self.tier.price_monthly, Decimal("99.00"))
        self.assertTrue(self.tier.allow_api_access)
        self.assertTrue(self.tier.allow_analytics)
        self.assertEqual(self.tier.max_users, 10)
    
    def test_tier_str(self):
        """Test tier string representation"""
        self.assertEqual(str(self.tier), "Premium")
    
    def test_get_features_list(self):
        """Test get_features_list returns correct features"""
        features = self.tier.get_features_list()
        
        self.assertIn("API Access", features)
        self.assertIn("Analytics Dashboard", features)
        self.assertIn("Advanced Reporting", features)
        self.assertIn("Multi-location Support", features)
        self.assertIn("Custom Integrations", features)
        self.assertIn("Priority Support", features)
    
    def test_tier_ordering(self):
        """Test tier ordering by display_order"""
        SubscriptionTier.objects.create(
            name="basic",
            display_order=1,
            price_monthly=Decimal("29.00")
        )
        
        tiers = list(SubscriptionTier.objects.all())
        # Basic should come before Premium due to display_order
        self.assertEqual(tiers[0].name, "basic")


class SubscriptionTierFreeTest(TestCase):
    """Test Free tier"""
    
    def setUp(self):
        self.free_tier = SubscriptionTier.objects.create(
            name="free",
            description="Free trial",
            max_users=1,
            max_storage_gb=1,
            price_monthly=Decimal("0.00"),
            price_yearly=Decimal("0.00"),
            allow_api_access=False,
            allow_analytics=False,
            allow_advanced_reporting=False,
            trial_days=7,
            is_active=True
        )
    
    def test_free_tier_creation(self):
        """Test free tier is created correctly"""
        self.assertEqual(self.free_tier.price_monthly, Decimal("0.00"))
        self.assertFalse(self.free_tier.allow_api_access)
        self.assertEqual(self.free_tier.trial_days, 7)


class SubscriptionModelTest(TestCase):
    """Test Subscription model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='subscription_user',
            email='sub@user.com',
            password='testpass123'
        )
        
        self.tier = SubscriptionTier.objects.create(
            name="basic",
            price_monthly=Decimal("29.00"),
            price_yearly=Decimal("290.00")
        )
        
        self.subscription = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            billing_email='billing@company.com',
            billing_cycle='monthly',
            auto_renewal=True
        )
    
    def test_subscription_creation(self):
        """Test subscription is created correctly"""
        self.assertEqual(self.subscription.tier.name, "basic")
        self.assertEqual(self.subscription.status, "active")
        self.assertEqual(self.subscription.tenant, self.user)
        self.assertTrue(self.subscription.auto_renewal)
    
    def test_subscription_str(self):
        """Test subscription string representation"""
        self.assertEqual(str(self.subscription), "basic - active")
    
    def test_is_active_method(self):
        """Test is_active method returns correct status"""
        # With future expiry date
        self.subscription.expiry_date = timezone.now() + timedelta(days=30)
        self.assertTrue(self.subscription.is_active())
        
        # With past expiry date
        self.subscription.expiry_date = timezone.now() - timedelta(days=1)
        self.assertFalse(self.subscription.is_active())
        
        # With no expiry date
        self.subscription.expiry_date = None
        self.assertFalse(self.subscription.is_active())
    
    def test_days_remaining_method(self):
        """Test days_remaining method returns correct days"""
        self.subscription.expiry_date = timezone.now() + timedelta(days=15)
        self.assertEqual(self.subscription.days_remaining(), 15)
        
        self.subscription.expiry_date = None
        self.assertIsNone(self.subscription.days_remaining())
    
    def test_is_expiring_soon_method(self):
        """Test is_expiring_soon method"""
        # Within 7 days
        self.subscription.expiry_date = timezone.now() + timedelta(days=5)
        self.assertTrue(self.subscription.is_expiring_soon())
        
        # More than 7 days
        self.subscription.expiry_date = timezone.now() + timedelta(days=10)
        self.assertFalse(self.subscription.is_expiring_soon())
        
        # Already expired
        self.subscription.expiry_date = timezone.now() - timedelta(days=1)
        self.assertFalse(self.subscription.is_expiring_soon())
    
    def test_can_use_feature_method(self):
        """Test can_use_feature method"""
        # Enable a feature
        self.subscription.enabled_features = {
            'api_access': True,
            'analytics': False
        }
        self.subscription.save()
        
        self.assertTrue(self.subscription.can_use_feature('api_access'))
        self.assertFalse(self.subscription.can_use_feature('analytics'))
        self.assertFalse(self.subscription.can_use_feature('nonexistent'))
    
    def test_record_payment_method(self):
        """Test record_payment method"""
        self.subscription.record_payment(
            amount=Decimal("29.00"),
            payment_method="Credit Card",
            gateway_ref="TXN12345"
        )
        
        self.subscription.refresh_from_db()
        
        self.assertEqual(self.subscription.last_payment_amount, Decimal("29.00"))
        self.assertEqual(self.subscription.total_paid_till_date, Decimal("29.00"))
        self.assertEqual(self.subscription.payment_method, "Credit Card")
        self.assertEqual(self.subscription.payment_gateway_reference, "TXN12345")


class SubscriptionStatusTest(TestCase):
    """Test Subscription status choices"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='status_user',
            email='status@user.com',
            password='testpass123'
        )
        
        self.tier = SubscriptionTier.objects.create(
            name="test_tier",
            price_monthly=Decimal("10.00")
        )
    
    def test_active_subscription(self):
        """Test active subscription status"""
        sub = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user
        )
        
        self.assertEqual(sub.status, 'active')
    
    def test_expired_subscription(self):
        """Test expired subscription status"""
        sub = Subscription.objects.create(
            tier=self.tier,
            status='expired',
            tenant=self.user
        )
        
        self.assertEqual(sub.status, 'expired')
    
    def test_suspended_subscription(self):
        """Test suspended subscription status"""
        sub = Subscription.objects.create(
            tier=self.tier,
            status='suspended',
            tenant=self.user
        )
        
        self.assertEqual(sub.status, 'suspended')
    
    def test_cancelled_subscription(self):
        """Test cancelled subscription status"""
        sub = Subscription.objects.create(
            tier=self.tier,
            status='cancelled',
            tenant=self.user
        )
        
        self.assertEqual(sub.status, 'cancelled')


class SubscriptionBillingCycleTest(TestCase):
    """Test Subscription billing cycles"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='billing_user',
            email='billing@user.com',
            password='testpass123'
        )
        
        self.tier = SubscriptionTier.objects.create(
            name="billing_tier",
            price_monthly=Decimal("29.00"),
            price_yearly=Decimal("290.00")
        )
    
    def test_monthly_billing_cycle(self):
        """Test monthly billing cycle"""
        sub = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            billing_cycle='monthly'
        )
        
        self.assertEqual(sub.billing_cycle, 'monthly')
    
    def test_quarterly_billing_cycle(self):
        """Test quarterly billing cycle"""
        sub = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            billing_cycle='quarterly'
        )
        
        self.assertEqual(sub.billing_cycle, 'quarterly')
    
    def test_yearly_billing_cycle(self):
        """Test yearly billing cycle"""
        sub = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            billing_cycle='yearly'
        )
        
        self.assertEqual(sub.billing_cycle, 'yearly')


class SubscriptionAPITest(APITestCase):
    """Test Subscription API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create admin user
        self.admin = User.objects.create_superuser(
            username='admin_sub',
            email='admin@sub.com',
            password='admin123'
        )
        
        # Create regular user
        self.user = User.objects.create_user(
            username='regular_sub',
            email='regular@sub.com',
            password='testpass123'
        )
        
        # Create tier
        self.tier = SubscriptionTier.objects.create(
            name="test_api_tier",
            price_monthly=Decimal("19.99"),
            is_active=True
        )
        
        # Create subscription
        self.subscription = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user
        )
    
    def test_list_subscriptions_as_admin(self):
        """Test admin can list all subscriptions"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/subscriptions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_list_subscriptions_as_user(self):
        """Test regular user can list own subscriptions"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/subscriptions/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_create_subscription_as_admin(self):
        """Test admin can create subscription"""
        self.client.force_authenticate(user=self.admin)
        
        new_user = User.objects.create_user(
            username='new_sub_user',
            email='new@sub.com',
            password='testpass123'
        )
        
        data = {
            'tier': self.tier.id,
            'status': 'active',
            'tenant': new_user.id,
            'billing_cycle': 'monthly',
            'auto_renewal': True
        }
        
        response = self.client.post('/api/subscriptions/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_retrieve_subscription(self):
        """Test retrieve subscription detail"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/subscriptions/{self.subscription.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'active')
    
    def test_update_subscription(self):
        """Test update subscription"""
        self.client.force_authenticate(user=self.admin)
        
        data = {'status': 'suspended'}
        response = self.client.patch(
            f'/api/subscriptions/{self.subscription.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'suspended')
    
    def test_delete_subscription(self):
        """Test delete subscription"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/subscriptions/{self.subscription.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_unauthenticated_access_denied(self):
        """Test unauthenticated access is denied"""
        response = self.client.get('/api/subscriptions/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SubscriptionTierAPITest(APITestCase):
    """Test SubscriptionTier API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create_user(
            username='tier_user',
            email='tier@user.com',
            password='testpass123',
            role='platform_operator'
        )
        self.client.force_authenticate(user=self.user)
        
        self.tier = SubscriptionTier.objects.create(
            name="api_test_tier",
            price_monthly=Decimal("39.99"),
            is_active=True,
            display_order=1
        )
    
    def test_list_tiers(self):
        """Test list all tiers"""
        response = self.client.get('/api/subscription-tiers/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data['results']) > 0)
    
    def test_retrieve_tier(self):
        """Test retrieve tier detail"""
        response = self.client.get(f'/api/subscription-tiers/{self.tier.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'api_test_tier')
    
    def test_tier_includes_features(self):
        """Test tier response includes features"""
        self.tier.allow_api_access = True
        self.tier.save()
        
        response = self.client.get(f'/api/subscription-tiers/{self.tier.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['allow_api_access'])


class SubscriptionFeatureFlagsTest(TestCase):
    """Test Subscription feature flags"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='feature_user',
            email='feature@user.com',
            password='testpass123'
        )
        
        self.tier = SubscriptionTier.objects.create(
            name="feature_tier",
            allow_api_access=True,
            allow_analytics=True
        )
        
        self.subscription = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            enabled_features={
                'custom_feature': True,
                'beta_feature': False
            }
        )
    
    def test_tier_level_features(self):
        """Test features from tier level"""
        self.assertTrue(self.tier.allow_api_access)
        self.assertTrue(self.tier.allow_analytics)
    
    def test_subscription_level_features(self):
        """Test features at subscription level override tier"""
        # Custom feature enabled at subscription level
        self.assertTrue(self.subscription.can_use_feature('custom_feature'))
        
        # Beta feature disabled at subscription level
        self.assertFalse(self.subscription.can_use_feature('beta_feature'))
    
    def test_combined_feature_check(self):
        """Test checking feature combines tier and subscription levels"""
        # Check tier-level feature through subscription
        self.assertTrue(self.subscription.can_use_feature('allow_api_access'))
        
        # Non-existent feature
        self.assertFalse(self.subscription.can_use_feature('nonexistent_feature'))


class SubscriptionUsageTrackingTest(TestCase):
    """Test Subscription usage tracking"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='usage_user',
            email='usage@user.com',
            password='testpass123'
        )
        
        self.tier = SubscriptionTier.objects.create(
            name="usage_tier",
            max_purchases_per_month=100,
            max_sales_per_month=200
        )
        
        self.subscription = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            purchases_this_month=50,
            sales_this_month=100
        )
    
    def test_usage_tracking_fields(self):
        """Test usage tracking fields are set correctly"""
        self.assertEqual(self.subscription.purchases_this_month, 50)
        self.assertEqual(self.subscription.sales_this_month, 100)
    
    def test_usage_within_limit(self):
        """Test usage within limit"""
        # These would be checked at the view level
        # Just verifying the fields exist
        self.assertIsNotNone(self.subscription.purchases_this_month)
        self.assertIsNotNone(self.subscription.sales_this_month)


class SubscriptionStorageTrackingTest(TestCase):
    """Test Subscription storage tracking"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='storage_user',
            email='storage@user.com',
            password='testpass123'
        )
        
        self.tier = SubscriptionTier.objects.create(
            name="storage_tier",
            max_storage_gb=10
        )
        
        self.subscription = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            storage_used_mb=Decimal("2048.00")  # 2GB used
        )
    
    def test_storage_tracking(self):
        """Test storage tracking fields"""
        self.assertEqual(self.subscription.storage_used_mb, Decimal("2048.00"))
        self.assertEqual(self.subscription.tier.max_storage_gb, 10)


class SubscriptionRenewalTest(TestCase):
    """Test Subscription renewal tracking"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='renewal_user',
            email='renewal@user.com',
            password='testpass123'
        )
        
        self.tier = SubscriptionTier.objects.create(
            name="renewal_tier",
            price_monthly=Decimal("29.00")
        )
        
        self.subscription = Subscription.objects.create(
            tier=self.tier,
            status='active',
            tenant=self.user,
            auto_renewal=True,
            last_renewal_date=timezone.now() - timedelta(days=25)
        )
    
    def test_renewal_tracking(self):
        """Test renewal tracking fields"""
        self.assertTrue(self.subscription.auto_renewal)
        self.assertIsNotNone(self.subscription.last_renewal_date)
    
    def test_renewal_reminder_flag(self):
        """Test renewal reminder flag"""
        self.subscription.renewal_reminder_sent = True
        self.subscription.save()
        
        self.assertTrue(self.subscription.renewal_reminder_sent)
    
    def test_expiry_warning_flag(self):
        """Test expiry warning flag"""
        self.subscription.expiry_warning_sent = True
        self.subscription.save()
        
        self.assertTrue(self.subscription.expiry_warning_sent)


@override_settings(ROOT_URLCONF='config.urls')
class SubscriptionEnforcementMiddlewareTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='middleware_user',
            email='middleware@example.com',
            password='testpass123',
            role='tenant_admin',
        )
        self.client.force_login(self.user)

    def test_write_requests_without_subscription_are_blocked(self):
        response = self.client.post('/api/fish-categories/', {
            'name': 'Blocked Category',
            'category_type': 'saltwater',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json()['code'], 'NO_SUBSCRIPTION')

    def test_subscription_errors_fail_closed(self):
        with patch('subscriptions.middleware._subscription_qs_for_user', side_effect=Exception('db unavailable')):
            response = self.client.post('/api/fish-categories/', {
                'name': 'Blocked Category',
                'category_type': 'saltwater',
            }, format='json')

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()['code'], 'SUBSCRIPTION_CHECK_FAILED')
