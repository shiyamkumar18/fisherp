import random
from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()

class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get("phone")
        if not phone:
            return Response({"error": "Phone required"}, status=status.HTTP_400_BAD_REQUEST)
        otp = str(random.randint(1000, 9999))
        cache.set(phone, otp, timeout=300)
        # TODO: Integrate with SMS gateway here
        if settings.DEBUG:
            print("OTP:", otp)
        return Response({"message": "OTP sent"}, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get("phone")
        otp = request.data.get("otp")
        if not phone or not otp:
            return Response({"error": "Phone and OTP required"}, status=status.HTTP_400_BAD_REQUEST)
        stored_otp = cache.get(phone)
        if stored_otp != otp:
            return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
        user, created = User.objects.get_or_create(phone=phone)
        cache.delete(phone)  # Invalidate OTP after use
        refresh = RefreshToken.for_user(user)
        return Response({
            "token": str(refresh.access_token),
            "user": {
                "id": user.id,
                "role": user.role,
                "tenantId": user.company_id,
                "is_platform_user": user.is_platform_user
            }
        }, status=status.HTTP_200_OK)
