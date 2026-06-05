
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.storage import default_storage


class CompanyDetailsView(APIView):
    """Get and update company details"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get company details"""
        user = request.user
        
        if not user.company:
            return Response(
                {'error': 'User is not associated with a company'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company = user.company
        return Response({
            'id': company.id,
            'name': company.name,
            'slug': company.slug,
            'phone': company.phone,
            'email': company.email,
            'gst': company.gst_number,
            'address': f"{company.address_line1 or ''} {company.address_line2 or ''}".strip(),
            'city': company.city,
            'state': company.state,
            'country': company.country,
            'postal_code': company.postal_code,
            'logo': company.logo.url if company.logo else None,
            'owner_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'business_type': company.business_type,
            'industry_type': company.industry_type,
            'is_active': company.is_active,
        })

    def put(self, request):
        """Update company details"""
        user = request.user

        if not user.company:
            return Response(
                {'error': 'User is not associated with a company'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.is_tenant_admin and not user.is_superuser:
            return Response(
                {'error': 'Only company admins can update company details'},
                status=status.HTTP_403_FORBIDDEN
            )

        company = user.company
        
        # Update company fields
        company.name = request.data.get('name', company.name)
        company.phone = request.data.get('phone', company.phone)
        company.email = request.data.get('email', company.email)
        company.gst_number = request.data.get('gst', company.gst_number)
        company.city = request.data.get('city', company.city)
        company.state = request.data.get('state', company.state)
        company.country = request.data.get('country', company.country)
        company.postal_code = request.data.get('pincode', company.postal_code)
        
        # Handle address field (split into line 1)
        if 'address' in request.data:
            company.address_line1 = request.data.get('address', company.address_line1)
        
        # Handle logo upload
        if 'logo' in request.FILES:
            logo_file = request.FILES['logo']
            if company.logo:
                try:
                    default_storage.delete(company.logo.name)
                except (FileNotFoundError, OSError):
                    pass
            company.logo = logo_file
        
        company.save()

        return Response({
            'message': 'Company settings updated successfully',
            'company': {
                'id': company.id,
                'name': company.name,
                'phone': company.phone,
                'email': company.email,
                'gst': company.gst_number,
                'city': company.city,
            }
        })
