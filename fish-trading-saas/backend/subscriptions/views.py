from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import SubscriptionTier, Subscription, SubscriptionAddOn, SubscriptionAddOnPurchase
from accounts.permissions import IsTenantAdmin
from .serializers import SubscriptionSerializer, SubscriptionTierSerializer
from services.subscriptions.entitlement_service import SubscriptionService


def _subscription_queryset_for_user(user, *, platform_all=False):
    qs = Subscription.objects.all().order_by("-created_at")
    if user.is_superuser:
        return qs
    if user.is_platform_user:
        return qs if platform_all else qs.none()
    if user.company_id:
        return qs.filter(company=user.company)
    return qs.filter(tenant=user)


class SubscriptionTierViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Backward-compatible tier endpoints:
    - GET /api/subscription-tiers/
    - GET /api/subscription-tiers/<id>/

    RBAC:
    - platform_operator: can view subscription tiers
    - platform_support: can view subscription tiers
    """

    queryset = SubscriptionTier.objects.filter(is_active=True).order_by("display_order")
    serializer_class = SubscriptionTierSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return self.queryset
        if getattr(user, "is_platform_operator", False) or getattr(user, "is_platform_support", False):
            return self.queryset
        return SubscriptionTier.objects.none()



class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    Backward-compatible subscription CRUD endpoints:
    - Superuser: full access
    - Regular user: own subscriptions read-only
    """
    serializer_class = SubscriptionSerializer
    queryset = Subscription.objects.all().order_by("-created_at")
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return _subscription_queryset_for_user(user, platform_all=True)

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"detail": "Only admin can create subscriptions."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"detail": "Only admin can update subscriptions."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"detail": "Only admin can update subscriptions."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({"detail": "Only admin can delete subscriptions."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class SubscriptionTierListView(APIView):
    """List all available subscription tiers
    
    Permissions:
    - PlatformMaintainer: Can create/edit tiers
    - All authenticated: Can view tiers
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        tiers = SubscriptionTier.objects.filter(is_active=True).order_by('display_order')
        
        tier_list = []
        for tier in tiers:
            tier_data = {
                'id': tier.id,
                'name': tier.name,
                'tier_level': tier.get_tier_level(),
                'description': tier.description,
                'max_users': tier.max_users,
                'max_storage_gb': tier.max_storage_gb,
                'price_monthly': str(tier.price_monthly),
                'price_yearly': str(tier.price_yearly),
                'trial_days': tier.trial_days,
                'is_recommended': tier.is_recommended,
                'features': tier.get_features_list(),
                # Basic features
                'allow_purchase_entry': tier.allow_purchase_entry,
                'allow_sale_entry': tier.allow_sale_entry,
                'allow_auto_profit_calculation': tier.allow_auto_profit_calculation,
                'allow_batch_based_selling': tier.allow_batch_based_selling,
                'allow_payment_tracking': tier.allow_payment_tracking,
                'allow_inventory': tier.allow_inventory,
                'allow_remaining_stock_update': tier.allow_remaining_stock_update,
                'allow_expiry_tracking': tier.allow_expiry_tracking,
                'allow_low_stock_alert': tier.allow_low_stock_alert,
                # Dashboard
                'allow_today_sales': tier.allow_today_sales,
                'allow_today_profit': tier.allow_today_profit,
                'allow_outstanding_receivables': tier.allow_outstanding_receivables,
                'allow_inventory_value': tier.allow_inventory_value,
                'allow_sales_trend': tier.allow_sales_trend,
                # Premium features
                'allow_advanced_analytics': tier.allow_advanced_analytics,
                'allow_profit_by_fish': tier.allow_profit_by_fish,
                'allow_profit_by_supplier': tier.allow_profit_by_supplier,
                'allow_batch_profit_analysis': tier.allow_batch_profit_analysis,
                'allow_monthly_comparison': tier.allow_monthly_comparison,
                'allow_credit_risk_alert': tier.allow_credit_risk_alert,
                'allow_overdue_alert': tier.allow_overdue_alert,
                'allow_advanced_receivable': tier.allow_advanced_receivable,
                'allow_quality_grading': tier.allow_quality_grading,
                'allow_commission_tracking': tier.allow_commission_tracking,
                'allow_supplier_performance': tier.allow_supplier_performance,
                'allow_ai_alerts': tier.allow_ai_alerts,
                'allow_expiry_risk_alert': tier.allow_expiry_risk_alert,
                'allow_demand_prediction': tier.allow_demand_prediction,
                'allow_profit_anomaly_detection': tier.allow_profit_anomaly_detection,
                'allow_csv_export': tier.allow_csv_export,
                'allow_pdf_reports': tier.allow_pdf_reports,
                # Enterprise features
                'allow_multi_location': tier.allow_multi_location,
                'allow_stock_transfer': tier.allow_stock_transfer,
                'allow_advanced_gst': tier.allow_advanced_gst,
                'allow_detailed_tax_reporting': tier.allow_detailed_tax_reporting,
                'allow_audit_logs': tier.allow_audit_logs,
                'allow_activity_history': tier.allow_activity_history,
                'allow_driver_tracking': tier.allow_driver_tracking,
                'allow_delivery_tracking': tier.allow_delivery_tracking,
                'allow_transport_management': tier.allow_transport_management,
                'allow_temperature_monitoring': tier.allow_temperature_monitoring,
                'allow_storage_alerts': tier.allow_storage_alerts,
                'allow_api_access': tier.allow_api_access,
                'allow_custom_domain': tier.allow_custom_domain,
                'allow_priority_support': tier.allow_priority_support,
                'allow_dedicated_onboarding': tier.allow_dedicated_onboarding,
            }
            tier_list.append(tier_data)
        
        return Response(tier_list)


class SubscriptionAddOnListView(APIView):
    """List all available subscription add-ons
    
    Permissions:
    - All authenticated: Can view add-ons
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        addons = SubscriptionAddOn.objects.filter(is_active=True).order_by('display_order')
        
        addon_list = []
        for addon in addons:
            addon_data = {
                'id': addon.id,
                'name': addon.name,
                'addon_type': addon.addon_type,
                'description': addon.description,
                'price_monthly': str(addon.price_monthly),
                'price_yearly': str(addon.price_yearly),
                'features': addon.features,
            }
            addon_list.append(addon_data)
        
        return Response(addon_list)


class CurrentSubscriptionView(APIView):
    """Get current user's subscription with full details"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            subscription = _subscription_queryset_for_user(request.user).first()
            if not subscription:
                raise Subscription.DoesNotExist
            
            # Get active add-ons
            active_addons = subscription.get_active_addons()
            addon_list = []
            for addon_purchase in active_addons:
                addon_list.append({
                    'id': addon_purchase.id,
                    'name': addon_purchase.addon.name,
                    'addon_type': addon_purchase.addon.addon_type,
                    'status': addon_purchase.status,
                    'expiry_date': addon_purchase.expiry_date,
                })
            
            return Response({
                'id': subscription.id,
                'tier': {
                    'id': subscription.tier.id,
                    'name': subscription.tier.name,
                    'tier_level': subscription.tier.get_tier_level(),
                    'max_users': subscription.tier.max_users,
                    'max_storage_gb': subscription.tier.max_storage_gb,
                    'price_monthly': str(subscription.tier.price_monthly),
                },
                'status': subscription.status,
                'start_date': subscription.start_date,
                'expiry_date': subscription.expiry_date,
                'is_active': subscription.is_active(),
                'days_remaining': subscription.days_remaining(),
                'billing_email': subscription.billing_email,
                'billing_address': subscription.billing_address,
                'gstin': subscription.gstin,
                'billing_cycle': subscription.billing_cycle,
                'auto_renewal': subscription.auto_renewal,
                'storage_used_mb': subscription.storage_used_mb,
                'signups_this_month': subscription.signups_this_month,
                'purchases_this_month': subscription.purchases_this_month,
                'sales_this_month': subscription.sales_this_month,
                'total_paid_till_date': str(subscription.total_paid_till_date),
                'features': subscription.get_tier_features(),
                'all_features': subscription.get_all_features(),
                'active_addons': addon_list,
            })
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )


class CreateSubscriptionView(APIView):
    """Create subscription for current user
    
    Permissions:
    - TenantAdmin: Can create subscription for their tenant
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantAdmin]
    
    def post(self, request):
        tier_id = request.data.get('tier_id')
        
        if not tier_id:
            return Response(
                {'error': 'tier_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tier = SubscriptionTier.objects.get(id=tier_id)
        except SubscriptionTier.DoesNotExist:
            return Response(
                {'error': 'Invalid tier'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if subscription already exists
        if _subscription_queryset_for_user(request.user).exists():
            return Response(
                {'error': 'Subscription already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate expiry date based on billing cycle
        from datetime import timedelta
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        start_date = timezone.now()
        
        if billing_cycle == 'monthly':
            expiry_date = start_date + timedelta(days=30)
        elif billing_cycle == 'quarterly':
            expiry_date = start_date + timedelta(days=90)
        elif billing_cycle == 'yearly':
            expiry_date = start_date + timedelta(days=365)
        else:
            expiry_date = start_date + timedelta(days=30)
        
        subscription = Subscription.objects.create(
            tenant=request.user,
            company=request.user.company,
            tier=tier,
            status='active',
            start_date=start_date,
            expiry_date=expiry_date,
            billing_cycle=billing_cycle,
            billing_email=request.data.get('billing_email', ''),
            billing_address=request.data.get('billing_address', ''),
            gstin=request.data.get('gstin', ''),
        )
        
        return Response({
            'message': 'Subscription created successfully',
            'subscription_id': subscription.id,
            'tier': tier.name,
            'tier_level': tier.get_tier_level(),
            'status': subscription.status,
            'expiry_date': subscription.expiry_date,
            'features': tier.get_features_list(),
        }, status=status.HTTP_201_CREATED)


class UpdateSubscriptionView(APIView):
    """Update subscription tier
    
    Permissions:
    - TenantAdmin: Can update their tenant's subscription
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantAdmin]

    def post(self, request):
        """Backward-compatible alias for upgrade endpoint."""
        return self.put(request)
    
    def put(self, request):
        tier_id = request.data.get('tier_id')
        
        try:
            subscription = _subscription_queryset_for_user(request.user).first()
            if not subscription:
                raise Subscription.DoesNotExist
            tier = SubscriptionTier.objects.get(id=tier_id)
            
            # Update tier
            subscription.tier = tier
            
            # Extend expiry date based on billing cycle
            from datetime import timedelta
            if subscription.billing_cycle == 'monthly':
                subscription.expiry_date = timezone.now() + timedelta(days=30)
            elif subscription.billing_cycle == 'quarterly':
                subscription.expiry_date = timezone.now() + timedelta(days=90)
            elif subscription.billing_cycle == 'yearly':
                subscription.expiry_date = timezone.now() + timedelta(days=365)
            
            subscription.save()
            
            return Response({
                'message': 'Subscription updated successfully',
                'tier': tier.name,
                'tier_level': tier.get_tier_level(),
                'expiry_date': subscription.expiry_date,
                'features': tier.get_features_list(),
            })
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except SubscriptionTier.DoesNotExist:
            return Response(
                {'error': 'Invalid tier'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PurchaseAddOnView(APIView):
    """Purchase an add-on for current subscription
    
    Permissions:
    - TenantAdmin: Can purchase add-ons
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantAdmin]
    
    def post(self, request):
        addon_id = request.data.get('addon_id')
        
        if not addon_id:
            return Response(
                {'error': 'addon_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscription = _subscription_queryset_for_user(request.user).first()
            if not subscription:
                raise Subscription.DoesNotExist
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            addon = SubscriptionAddOn.objects.get(id=addon_id, is_active=True)
        except SubscriptionAddOn.DoesNotExist:
            return Response(
                {'error': 'Invalid add-on'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already purchased
        if subscription.has_addon(addon.addon_type):
            return Response(
                {'error': 'Add-on already active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate expiry date
        from datetime import timedelta
        expiry_date = timezone.now() + timedelta(days=30)
        
        addon_purchase = SubscriptionAddOnPurchase.objects.create(
            subscription=subscription,
            addon=addon,
            status='active',
            expiry_date=expiry_date,
            price_paid=addon.price_monthly,
        )
        
        return Response({
            'message': 'Add-on purchased successfully',
            'addon_purchase_id': addon_purchase.id,
            'addon_name': addon.name,
            'expiry_date': expiry_date,
        }, status=status.HTTP_201_CREATED)


class CancelAddOnView(APIView):
    """Cancel an add-on subscription
    
    Permissions:
    - TenantAdmin: Can cancel add-ons
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantAdmin]
    
    def post(self, request):
        addon_purchase_id = request.data.get('addon_purchase_id')
        
        if not addon_purchase_id:
            return Response(
                {'error': 'addon_purchase_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscription = _subscription_queryset_for_user(request.user).first()
            if not subscription:
                raise Subscription.DoesNotExist
            addon_purchase = SubscriptionAddOnPurchase.objects.get(
                id=addon_purchase_id,
                subscription=subscription,
                status='active'
            )
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except SubscriptionAddOnPurchase.DoesNotExist:
            return Response(
                {'error': 'Add-on purchase not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        addon_purchase.status = 'cancelled'
        addon_purchase.save()
        
        return Response({
            'message': 'Add-on cancelled successfully',
        })


class CheckFeatureAccessView(APIView):
    """Check if user can access a specific feature
    
    Permissions:
    - All authenticated: Can check feature access
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        feature_name = request.query_params.get('feature_name')
        
        if not feature_name:
            return Response(
                {'error': 'feature_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        company = getattr(request.user, 'company', None)
        can_access = SubscriptionService.has_feature(company, feature_name, user=request.user)
        
        # Try to fetch tier name for legacy frontend expectations
        tier_name = 'unknown'
        subscription = SubscriptionService.get_active_subscription(company)
        if subscription:
            tier_name = subscription.tier.name
            
        return Response({
            'feature_name': feature_name,
            'can_access': can_access,
            'subscription_tier': tier_name,
        })


class MyEntitlementsView(APIView):
    """
    Get all active entitlements for the current tenant's subscription.
    Used by the frontend to dynamically render features, hide buttons, and gating.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        company = getattr(request.user, 'company', None)
        entitlements = SubscriptionService.get_entitlements(company)
        
        subscription = SubscriptionService.get_active_subscription(company)
        status_value = subscription.status if subscription else 'inactive'
        
        return Response({
            'entitlements': entitlements,
            'status': status_value,
        })


class CreateCheckoutSessionView(APIView):
    """
    Generate a Stripe Checkout Session URL for a specific tier.
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantAdmin]

    def post(self, request):
        tier_id = request.data.get('tier_id')
        if not tier_id:
            return Response({'error': 'tier_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tier = SubscriptionTier.objects.get(id=tier_id)
        except SubscriptionTier.DoesNotExist:
            return Response({'error': 'Invalid tier'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .billing import create_checkout_session
            url = create_checkout_session(request.user.company, tier)
            return Response({'url': url})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StripeWebhookView(APIView):
    """
    Handle incoming Stripe Webhooks to update subscriptions.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            from .billing import handle_stripe_webhook
            success = handle_stripe_webhook(payload, sig_header)
            if success:
                return Response(status=status.HTTP_200_OK)
            return Response({'error': 'Webhook signature verification failed'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
