from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from saas_platform.accounts.permissions import IsPlatformOperatorOrReadOnlySupport
from saas_platform.accounts.models_audit import AuditLog, get_client_ip
from saas_platform.companies.models import Company
from saas_platform.subscriptions.models import Subscription


class FeatureFlagListView(APIView):
    """
    List all feature flags across the platform.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def get(self, request):
        """List all tenants with their enabled features"""
        tenant_id = request.query_params.get('tenant_id')
        
        if tenant_id:
            try:
                company = Company.objects.get(id=tenant_id)
            except Company.DoesNotExist:
                return Response(
                    {'error': 'Tenant not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            subscription = (
                Subscription.objects.filter(company=company, status='active')
                .order_by('-created_at')
                .first()
                or Subscription.objects.filter(company=company).order_by('-created_at').first()
            )
            if not subscription:
                return Response(
                    {'error': 'No subscription found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response({
                'tenant': {
                    'id': getattr(company, 'id', None),
                    'name': company.name,
                },
                'enabled_features': subscription.enabled_features,
                'tier_features': subscription.get_tier_features(),
            })
        
        # Return all tenants with their features
        tenants = []
        companies = Company.objects.prefetch_related('subscriptions__tier')[:50]
        for company in companies:
            subs = list(company.subscriptions.all())
            subs.sort(key=lambda s: s.created_at, reverse=True)
            
            # find first active
            active_subs = [s for s in subs if s.status == 'active']
            subscription = active_subs[0] if active_subs else (subs[0] if subs else None)
            
            if subscription:
                tenants.append({
                    'id': getattr(company, 'id', None),
                    'name': company.name,
                    'tier': getattr(subscription.tier, 'name', 'None') if subscription.tier else 'None',
                    'enabled_features': subscription.enabled_features,
                })
            else:
                tenants.append({
                    'id': getattr(company, 'id', None),
                    'name': company.name,
                    'tier': 'None',
                    'enabled_features': {},
                })
        
        return Response({'tenants': tenants})


class FeatureFlagUpdateView(APIView):
    """
    Enable/disable specific features for a tenant.
    """
    permission_classes = [permissions.IsAuthenticated, IsPlatformOperatorOrReadOnlySupport]
    
    def post(self, request, tenant_id):
        feature_name = request.data.get('feature_name')
        enabled = request.data.get('enabled', False)
        
        if not feature_name:
            return Response(
                {'error': 'feature_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(id=tenant_id)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Tenant not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        subscription = (
            Subscription.objects.filter(company=company, status='active')
            .order_by('-created_at')
            .first()
            or Subscription.objects.filter(company=company).order_by('-created_at').first()
        )
        if not subscription:
            return Response(
                {'error': 'No subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update feature flag
        features = subscription.enabled_features or {}
        features[feature_name] = enabled
        subscription.enabled_features = features
        subscription.save()
        
        # Log
        AuditLog.log_update(
            user=request.user,
            model_name='Subscription',
            object_id=getattr(subscription, 'id', None),
            object_repr=f"Subscription for {company.name}",
            changes={'feature_flag': feature_name, 'enabled': enabled},
            tenant=company,
            ip_address=get_client_ip(request)
        )
        
        return Response({
            'message': f'Feature "{feature_name}" {"enabled" if enabled else "disabled"}',
            'enabled_features': subscription.enabled_features,
        })
