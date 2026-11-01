from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from saas_platform.accounts.permissions import IsPlatformOperatorOrReadOnlySupport
from saas_platform.accounts.models_audit import AuditLog, get_client_ip
from saas_platform.subscriptions.models import Subscription, SubscriptionTier


class SubscriptionTierManagementView(APIView):
    """
    Manage subscription tiers (CRUD).
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        """List all tiers"""
        tiers = SubscriptionTier.objects.all().order_by('display_order')
        
        return Response({
            'tiers': [
                {
                    'id': getattr(tier, 'id', None),
                    'name': tier.name,
                    'description': tier.description,
                    'max_users': tier.max_users,
                    'max_storage_gb': tier.max_storage_gb,
                    'price_monthly': str(tier.price_monthly),
                    'price_yearly': str(tier.price_yearly),
                    'is_active': tier.is_active,
                    'display_order': tier.display_order,
                    'is_recommended': tier.is_recommended,
                    'trial_days': tier.trial_days,
                    'feature_count': len(tier.get_features_list()),
                }
                for tier in tiers
            ]
        })
    
    def post(self, request):
        """Create new tier"""
        name = request.data.get('name')
        
        if not name:
            return Response(
                {'error': 'Name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if SubscriptionTier.objects.filter(name=name).exists():
            return Response(
                {'error': 'Tier with this name already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tier = SubscriptionTier.objects.create(
            name=name,
            description=request.data.get('description', ''),
            max_users=request.data.get('max_users', 1),
            max_storage_gb=request.data.get('max_storage_gb', 5),
            price_monthly=request.data.get('price_monthly', 0),
            price_yearly=request.data.get('price_yearly', 0),
            is_active=request.data.get('is_active', True),
            display_order=request.data.get('display_order', 0),
        )
        
        AuditLog.log_create(
            user=request.user,
            model_name='SubscriptionTier',
            object_id=getattr(tier, 'id', None),
            object_repr=f"Subscription tier: {tier.name}",
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': f'Tier "{name}" created successfully',
            'tier': {
                'id': getattr(tier, 'id', None),
                'name': tier.name,
            }
        }, status=status.HTTP_201_CREATED)


class SubscriptionTierDetailView(APIView):
    """
    Manage individual subscription tier.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request, tier_id):
        try:
            tier = SubscriptionTier.objects.get(id=tier_id)
        except SubscriptionTier.DoesNotExist:
            return Response(
                {'error': 'Tier not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get subscription count
        subscription_count = Subscription.objects.filter(tier=tier).count()
        
        return Response({
            'id': getattr(tier, 'id', None),
            'name': tier.name,
            'description': tier.description,
            'max_users': tier.max_users,
            'max_storage_gb': tier.max_storage_gb,
            'price_monthly': str(tier.price_monthly),
            'price_yearly': str(tier.price_yearly),
            'is_active': tier.is_active,
            'display_order': tier.display_order,
            'is_recommended': tier.is_recommended,
            'trial_days': tier.trial_days,
            'subscription_count': subscription_count,
            'features': tier.get_features_list(),
        })
    
    def patch(self, request, tier_id):
        """Update tier"""
        try:
            tier = SubscriptionTier.objects.get(id=tier_id)
        except SubscriptionTier.DoesNotExist:
            return Response(
                {'error': 'Tier not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        allowed_fields = [
            'description', 'max_users', 'max_storage_gb',
            'price_monthly', 'price_yearly', 'is_active',
            'display_order', 'is_recommended', 'trial_days'
        ]
        
        changes = {}
        for field in allowed_fields:
            if field in request.data:
                old_value = getattr(tier, field)
                new_value = request.data[field]
                setattr(tier, field, new_value)
                changes[field] = f"{old_value} -> {new_value}"
        
        tier.save()
        
        AuditLog.log_update(
            user=request.user,
            model_name='SubscriptionTier',
            object_id=getattr(tier, 'id', None),
            object_repr=f"Subscription tier: {tier.name}",
            changes=changes,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': 'Tier updated successfully',
            'tier': {
                'id': getattr(tier, 'id', None),
                'name': tier.name,
            }
        })
