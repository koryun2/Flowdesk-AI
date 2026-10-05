from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    FlowdeskTokenSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


class AuthRateThrottle(AnonRateThrottle):
    scope = "auth"


class LoginView(TokenObtainPairView):
    serializer_class = FlowdeskTokenSerializer
    throttle_classes = [AuthRateThrottle]


class RefreshView(TokenRefreshView):
    throttle_classes = [AuthRateThrottle]


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(token_payload(user), status=status.HTTP_201_CREATED)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class PasswordChangeView(APIView):
    def post(self, request):
        current = request.data.get("current_password")
        new_password = request.data.get("new_password")
        if not isinstance(current, str) or not request.user.check_password(current):
            raise ValidationError({"current_password": "That password is incorrect."})
        if not isinstance(new_password, str) or not new_password:
            raise ValidationError({"new_password": "Enter a new password."})
        try:
            validate_password(new_password, request.user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": exc.messages[0]}) from exc
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


def token_payload(user) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }
