from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from organizations.models import Membership, Organization

from .models import User


class OrganizationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name", "slug", "plan"]


class MembershipSerializer(serializers.ModelSerializer):
    organization = OrganizationSummarySerializer()

    class Meta:
        model = Membership
        fields = ["id", "role", "organization"]


TIMEZONES = {"UTC", "Asia/Yerevan", "America/Los_Angeles"}


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "timezone"]

    def validate_first_name(self, value: str) -> str:
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Enter your name.")
        return name

    def validate_last_name(self, value: str) -> str:
        return value.strip()

    def validate_email(self, value: str) -> str:
        email = value.lower()
        if User.objects.exclude(pk=self.instance.pk).filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_timezone(self, value: str) -> str:
        if value not in TIMEZONES:
            raise serializers.ValidationError("Choose a timezone.")
        return value


class UserSerializer(serializers.ModelSerializer):
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "timezone", "memberships"]

    def get_memberships(self, user: User):
        memberships = user.memberships.select_related("organization").filter(
            accepted_at__isnull=False,
            organization__is_active=True,
        )
        return MembershipSerializer(memberships, many=True).data


class FlowdeskTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=150, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    workspace_name = serializers.CharField(min_length=2, max_length=160, trim_whitespace=True)

    def validate_email(self, value: str) -> str:
        email = value.lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        first_name, _, last_name = validated_data["name"].partition(" ")
        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=first_name,
                last_name=last_name,
            )
            organization = Organization.objects.create(
                name=validated_data["workspace_name"],
                slug=unique_slug(validated_data["workspace_name"]),
            )
            Membership.objects.create(
                organization=organization,
                user=user,
                role=Membership.Role.OWNER,
                accepted_at=timezone.now(),
            )
        return user


def unique_slug(value: str) -> str:
    base = slugify(value)[:70] or "workspace"
    slug = base
    suffix = 2
    while Organization.objects.filter(slug=slug).exists():
        slug = f"{base[:70]}-{suffix}"
        suffix += 1
    return slug
