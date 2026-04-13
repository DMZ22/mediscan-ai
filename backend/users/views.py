from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser
from .serializers import (
    UserRegistrationSerializer, UserProfileSerializer, UserListSerializer
)

import os

ADMIN_SECRET_CODE = os.getenv("ADMIN_SECRET_CODE", "")


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserProfileSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        role = data.get('role', 'doctor')

        # Validate admin secret code
        if role == 'admin':
            admin_code = data.get('admin_code', '')
            if admin_code != ADMIN_SECRET_CODE:
                return Response(
                    {'admin_code': ['Invalid admin access code. Contact hospital IT administration.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Admins have no department
            data['department'] = ''

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            'message': 'Account created successfully.',
            'user': UserProfileSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserListSerializer
    queryset = CustomUser.objects.filter(is_active=True)
