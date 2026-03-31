"""
Management command to seed subscription tiers with all features.
"""
from django.core.management.base import BaseCommand
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seed subscription tiers with default features and pricing'

    def handle(self, *args, **options):
        from subscriptions.models import SubscriptionTier
        
        self.stdout.write('Seeding subscription tiers...')
        
        # Create FREE Tier
        free_tier, created = SubscriptionTier.objects.update_or_create(
            name='free',
            defaults={
                'description': 'Free trial to explore the platform',
                'max_users': 1,
                'max_storage_gb': 1,
                'price_monthly': Decimal('0'),
                'price_yearly': Decimal('0'),
                'trial_days': 7,
                'display_order': 0,
                'is_active': True,
                # Basic features
                'allow_purchase_entry': True,
                'allow_sale_entry': True,
                'allow_auto_profit_calculation': True,
                'allow_batch_based_selling': True,
                'allow_payment_tracking': True,
                'allow_inventory': True,
                'allow_remaining_stock_update': True,
                'allow_expiry_tracking': True,
                'allow_low_stock_alert': True,
                'allow_today_sales': True,
                'allow_today_profit': True,
                'allow_outstanding_receivables': True,
                'allow_inventory_value': True,
                'allow_sales_trend': True,
                'allow_tenant_admin': True,
                'allow_staff_users': False,
                'allow_role_based_access': True,
                'allow_monthly_billing': True,
                'allow_free_trial': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created FREE tier'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated FREE tier'))

        # Create BASIC Tier
        basic_tier, created = SubscriptionTier.objects.update_or_create(
            name='basic',
            defaults={
                'description': 'For small fish traders - Low price, max 3 users (1 Admin + 2 Staff)',
                'max_users': 3,
                'max_storage_gb': 5,
                'price_monthly': Decimal('29.00'),
                'price_yearly': Decimal('290.00'),
                'trial_days': 7,
                'display_order': 1,
                'is_active': True,
                'is_recommended': False,
                # All Basic features enabled
                # Purchase & Sale
                'allow_purchase_entry': True,
                'allow_sale_entry': True,
                'allow_auto_profit_calculation': True,
                'allow_batch_based_selling': True,
                'allow_payment_tracking': True,
                # Inventory
                'allow_inventory': True,
                'allow_remaining_stock_update': True,
                'allow_expiry_tracking': True,
                'allow_low_stock_alert': True,
                # Dashboard (Simple)
                'allow_today_sales': True,
                'allow_today_profit': True,
                'allow_outstanding_receivables': True,
                'allow_inventory_value': True,
                'allow_sales_trend': True,
                # Users & Access
                'allow_tenant_admin': True,
                'allow_staff_users': True,
                'allow_role_based_access': True,
                # Subscription
                'allow_monthly_billing': True,
                'allow_free_trial': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created BASIC tier'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated BASIC tier'))

        # Create PREMIUM Tier
        premium_tier, created = SubscriptionTier.objects.update_or_create(
            name='premium',
            defaults={
                'description': 'For growing businesses - Up to 10 users with advanced features',
                'max_users': 10,
                'max_storage_gb': 25,
                'price_monthly': Decimal('79.00'),
                'price_yearly': Decimal('790.00'),
                'trial_days': 14,
                'display_order': 2,
                'is_active': True,
                'is_recommended': True,
                # All Basic features
                'allow_purchase_entry': True,
                'allow_sale_entry': True,
                'allow_auto_profit_calculation': True,
                'allow_batch_based_selling': True,
                'allow_payment_tracking': True,
                'allow_inventory': True,
                'allow_remaining_stock_update': True,
                'allow_expiry_tracking': True,
                'allow_low_stock_alert': True,
                'allow_today_sales': True,
                'allow_today_profit': True,
                'allow_outstanding_receivables': True,
                'allow_inventory_value': True,
                'allow_sales_trend': True,
                'allow_tenant_admin': True,
                'allow_staff_users': True,
                'allow_role_based_access': True,
                'allow_monthly_billing': True,
                'allow_free_trial': True,
                # All Premium features
                # Analytics
                'allow_advanced_analytics': True,
                'allow_profit_by_fish': True,
                'allow_profit_by_supplier': True,
                'allow_batch_profit_analysis': True,
                'allow_monthly_comparison': True,
                # Credit & Risk
                'allow_credit_risk_alert': True,
                'allow_overdue_alert': True,
                'allow_advanced_receivable': True,
                # Quality & Commission
                'allow_quality_grading': True,
                'allow_commission_tracking': True,
                'allow_supplier_performance': True,
                # AI Features
                'allow_ai_alerts': True,
                'allow_expiry_risk_alert': True,
                'allow_demand_prediction': True,
                'allow_profit_anomaly_detection': True,
                # Reports
                'allow_csv_export': True,
                'allow_pdf_reports': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created PREMIUM tier'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated PREMIUM tier'))

        # Create ENTERPRISE Tier
        enterprise_tier, created = SubscriptionTier.objects.update_or_create(
            name='enterprise',
            defaults={
                'description': 'For large seafood companies - Unlimited users with all features',
                'max_users': 999,  # Unlimited
                'max_storage_gb': 100,
                'price_monthly': Decimal('199.00'),
                'price_yearly': Decimal('1990.00'),
                'trial_days': 30,
                'display_order': 3,
                'is_active': True,
                'is_recommended': False,
                # All Basic features
                'allow_purchase_entry': True,
                'allow_sale_entry': True,
                'allow_auto_profit_calculation': True,
                'allow_batch_based_selling': True,
                'allow_payment_tracking': True,
                'allow_inventory': True,
                'allow_remaining_stock_update': True,
                'allow_expiry_tracking': True,
                'allow_low_stock_alert': True,
                'allow_today_sales': True,
                'allow_today_profit': True,
                'allow_outstanding_receivables': True,
                'allow_inventory_value': True,
                'allow_sales_trend': True,
                'allow_tenant_admin': True,
                'allow_staff_users': True,
                'allow_role_based_access': True,
                'allow_monthly_billing': True,
                'allow_free_trial': True,
                # All Premium features
                'allow_advanced_analytics': True,
                'allow_profit_by_fish': True,
                'allow_profit_by_supplier': True,
                'allow_batch_profit_analysis': True,
                'allow_monthly_comparison': True,
                'allow_credit_risk_alert': True,
                'allow_overdue_alert': True,
                'allow_advanced_receivable': True,
                'allow_quality_grading': True,
                'allow_commission_tracking': True,
                'allow_supplier_performance': True,
                'allow_ai_alerts': True,
                'allow_expiry_risk_alert': True,
                'allow_demand_prediction': True,
                'allow_profit_anomaly_detection': True,
                'allow_csv_export': True,
                'allow_pdf_reports': True,
                # All Enterprise features
                # Multi-location
                'allow_multi_location': True,
                'allow_stock_transfer': True,
                # Advanced Compliance
                'allow_advanced_gst': True,
                'allow_detailed_tax_reporting': True,
                'allow_audit_logs': True,
                'allow_activity_history': True,
                # Logistics
                'allow_driver_tracking': True,
                'allow_delivery_tracking': True,
                'allow_transport_management': True,
                # Cold Storage
                'allow_temperature_monitoring': True,
                'allow_storage_alerts': True,
                # Technical
                'allow_api_access': True,
                'allow_custom_domain': True,
                'allow_priority_support': True,
                'allow_dedicated_onboarding': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created ENTERPRISE tier'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated ENTERPRISE tier'))

        # Seed Add-ons
        self.seed_addons()

        self.stdout.write(self.style.SUCCESS('\n✓ All subscription tiers seeded successfully!'))
        
        # Print summary
        self.print_tier_summary()

    def seed_addons(self):
        """Seed optional add-ons"""
        from subscriptions.models import SubscriptionAddOn
        
        addons_data = [
            {
                'addon_type': 'voice_entry',
                'name': 'Voice-to-Entry Module',
                'description': 'Use voice commands to enter purchase and sale data hands-free',
                'price_monthly': Decimal('19.00'),
                'price_yearly': Decimal('190.00'),
                'features': {
                    'features': [
                        'Voice purchase entry',
                        'Voice sale entry',
                        'Voice inventory lookup',
                        'Multi-language support',
                    ]
                },
                'display_order': 1,
            },
            {
                'addon_type': 'ai_analytics',
                'name': 'AI Analytics Module',
                'description': 'Advanced AI-powered analytics and predictions',
                'price_monthly': Decimal('49.00'),
                'price_yearly': Decimal('490.00'),
                'features': {
                    'features': [
                        'Advanced demand forecasting',
                        'Price optimization suggestions',
                        'Customer behavior analysis',
                        'Inventory prediction',
                        'Trend analysis',
                    ]
                },
                'display_order': 2,
            },
            {
                'addon_type': 'advanced_reporting',
                'name': 'Advanced Reporting Module',
                'description': 'Custom reports, scheduled reports, and business intelligence',
                'price_monthly': Decimal('29.00'),
                'price_yearly': Decimal('290.00'),
                'features': {
                    'features': [
                        'Custom report builder',
                        'Scheduled reports',
                        'Dashboard customization',
                        'Data export options',
                        'Report templates',
                    ]
                },
                'display_order': 3,
            },
            {
                'addon_type': 'sms_alerts',
                'name': 'SMS Alert Module',
                'description': 'Send SMS notifications to customers and suppliers',
                'price_monthly': Decimal('15.00'),
                'price_yearly': Decimal('150.00'),
                'features': {
                    'features': [
                        'Order confirmation SMS',
                        'Delivery notifications',
                        'Payment reminders',
                        'Expiry alerts',
                        'Custom SMS templates',
                    ]
                },
                'display_order': 4,
            },
        ]
        
        for addon_data in addons_data:
            addon_type = addon_data.pop('addon_type')
            addon, created = SubscriptionAddOn.objects.update_or_create(
                addon_type=addon_type,
                defaults=addon_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created add-on: {addon.name}'))

    def print_tier_summary(self):
        """Print summary of all tiers"""
        from subscriptions.models import SubscriptionTier
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('SUBSCRIPTION TIER SUMMARY')
        self.stdout.write('=' * 60)
        
        tiers = SubscriptionTier.objects.filter(is_active=True).order_by('display_order')
        
        for tier in tiers:
            self.stdout.write(f'\n{tier.get_tier_level().upper()} - {tier.name}')
            self.stdout.write(f'  Price: ${tier.price_monthly}/month or ${tier.price_yearly}/year')
            self.stdout.write(f'  Max Users: {tier.max_users}')
            self.stdout.write(f'  Features: {len(tier.get_features_list())} enabled')
        
        self.stdout.write('\n' + '=' * 60)
