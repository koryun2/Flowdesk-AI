from rest_framework import serializers

from .models import Customer

PLAN_CHOICES = ["Starter", "Growth", "Enterprise"]
HEALTH_CHOICES = ["healthy", "at_risk", "critical"]
PROFILE_FIELDS = ("plan", "health", "lifetime_value")
OPEN_TICKET_STATUSES = ("new", "investigating", "waiting")


class CustomerSerializer(serializers.ModelSerializer):
    plan = serializers.ChoiceField(choices=PLAN_CHOICES, required=False)
    health = serializers.ChoiceField(choices=HEALTH_CHOICES, required=False)
    lifetime_value = serializers.IntegerField(min_value=0, required=False)
    ticket_count = serializers.IntegerField(read_only=True)
    open_ticket_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "email",
            "company",
            "phone",
            "external_id",
            "notes",
            "plan",
            "health",
            "lifetime_value",
            "ticket_count",
            "open_ticket_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "name": {"min_length": 2, "max_length": 160},
            "company": {"max_length": 160},
        }

    def validate_email(self, value):
        if value is None or value == "":
            return None
        email = value.lower()
        organization = self.context["request"].membership.organization
        existing = Customer.objects.filter(organization=organization, email__iexact=email)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError(
                "A customer with this email already exists in the workspace."
            )
        return email

    def to_representation(self, instance):
        data = super().to_representation(instance)
        metadata = instance.metadata or {}
        data["plan"] = metadata.get("plan", "Growth")
        data["health"] = metadata.get("health", "healthy")
        data["lifetime_value"] = metadata.get("lifetime_value", 0)
        return data

    def create(self, validated_data):
        return super().create(self._merge_profile(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._merge_profile(validated_data))

    def _merge_profile(self, validated_data):
        metadata = dict(self.instance.metadata if self.instance else {})
        metadata.update(validated_data.pop("metadata", {}) or {})
        for field in PROFILE_FIELDS:
            if field in validated_data:
                metadata[field] = validated_data.pop(field)
        validated_data["metadata"] = metadata
        return validated_data
