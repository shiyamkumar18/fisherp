from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .models import SubscriptionTier, Subscription
from accounts.permissions import IsPlatformMaintainer, IsTenantAdmin


class SubscriptionTierListView(APIView):
    """List all available subscription tiers
    
    Permissions:
    - PlatformMaintainer: Can create/edit tiers
    - All authenticated: Can view tiers
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        tiers = SubscriptionTier.objects.all().values(
            'id', 'name', 'max_users', 'max_storage_gb',
            'price_monthly', 'price_yearly',
            'allow_api_access', 'allow_analytics'
        )
        return Response(list(tiers))


class CurrentSubscriptionView(APIView):
    """Get current user's subscription"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        try:
            subscription = Subscription.objects.get(
                tenant=request.user
            )
            return Response({
                'id': subscription.id,
                'tier': subscription.tier.name,
                'status': subscription.status,
                'start_date': subscription.start_date,
                'expiry_date': subscription.expiry_date,
                'is_active': subscription.is_active(),
                'days_remaining': subscription.days_remaining(),
                'billing_email': subscription.billing_email,
                'billing_address': subscription.billing_address,
                'gstin': subscription.gstin,
                'storage_used_mb': subscription.storage_used_mb,
                'signups_this_month': subscription.signups_this_month,
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
        if Subscription.objects.filter(tenant=request.user).exists():
            return Response(
                {'error': 'Subscription already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        subscription = Subscription.objects.create(
            tenant=request.user,
            tier=tier,
            status='active',
            billing_email=request.data.get('billing_email', ''),
            billing_address=request.data.get('billing_address', ''),
            gstin=request.data.get('gstin', ''),
        )
        
        return Response({
            'message': 'Subscription created successfully',
            'subscription_id': subscription.id,
            'tier': tier.name,
            'status': subscription.status,
        }, status=status.HTTP_201_CREATED)


class UpdateSubscriptionView(APIView):
    """Update subscription tier
    
    Permissions:
    - TenantAdmin: Can update their tenant's subscription
    """
    permission_classes = [permissions.IsAuthenticated, IsTenantAdmin]
    
    def put(self, request):
        tier_id = request.data.get('tier_id')
        
        try:
            subscription = Subscription.objects.get(tenant=request.user)
            tier = SubscriptionTier.objects.get(id=tier_id)
            
            subscription.tier = tier
            subscription.save()
            
            return Response({
                'message': 'Subscription updated successfully',
                'tier': tier.name,
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
