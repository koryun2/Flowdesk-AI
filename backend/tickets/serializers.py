from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from audit.models import ActivityLog
from customers.models import Customer
from organizations.models import Membership, Organization

from .models import Comment, Tag, Ticket, TicketTag


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value: str) -> str:
        name = value.strip()
        organization = self.context["request"].membership.organization
        existing = Tag.objects.filter(organization=organization, name__iexact=name)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("A tag with this name already exists.")
        return name

    def validate_color(self, value: str) -> str:
        return value.upper()


class CustomerSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "email", "company"]


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Comment
        fields = ["id", "author", "parent", "body", "is_internal", "created_at", "edited_at"]
        read_only_fields = ["id", "author", "created_at", "edited_at"]

    def validate_body(self, value: str) -> str:
        body = value.strip()
        if not body:
            raise serializers.ValidationError("Comment text is required.")
        return body

    def validate_parent(self, parent):
        ticket = self.context.get("ticket")
        if parent is not None and ticket is not None and parent.ticket_id != ticket.id:
            raise serializers.ValidationError("A reply must belong to the same ticket.")
        return parent


class ActivitySerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    detail = serializers.SerializerMethodField()
    tone = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ["id", "actor", "action", "detail", "tone", "created_at"]

    def get_actor(self, log: ActivityLog) -> str:
        if log.actor_id:
            name = f"{log.actor.first_name} {log.actor.last_name}".strip()
            return name or log.actor.email
        return (log.context or {}).get("actor_name", "System")

    def get_detail(self, log: ActivityLog):
        return (log.context or {}).get("detail") or ""

    def get_tone(self, log: ActivityLog) -> str:
        return (log.context or {}).get("tone", "default")


class TicketSerializer(serializers.ModelSerializer):
    customer = CustomerSummarySerializer(read_only=True)
    customer_id = serializers.UUIDField(write_only=True, required=False)
    assignee = UserSummarySerializer(read_only=True)
    assignee_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )
    key = serializers.SerializerMethodField()
    comment_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "key",
            "number",
            "title",
            "description",
            "status",
            "priority",
            "source",
            "customer",
            "customer_id",
            "assignee",
            "assignee_id",
            "tags",
            "tag_ids",
            "comment_count",
            "version",
            "due_at",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "key",
            "number",
            "version",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "title": {"min_length": 5, "max_length": 240},
            "description": {"min_length": 15},
        }

    def get_key(self, ticket: Ticket) -> str:
        return f"FD-{ticket.number}"

    def validate(self, attrs):
        organization = self.context["request"].membership.organization
        if self.instance is None and "customer_id" not in attrs:
            raise serializers.ValidationError({"customer_id": "Choose a customer."})
        if "customer_id" in attrs:
            customer = Customer.objects.filter(
                organization=organization,
                pk=attrs["customer_id"],
            ).first()
            if customer is None:
                raise serializers.ValidationError(
                    {"customer_id": "Choose a customer in this workspace."}
                )
            attrs["customer"] = customer
        if "assignee_id" in attrs:
            attrs["assignee"] = member_or_error(organization, attrs.get("assignee_id"))
        if "tag_ids" in attrs:
            attrs["tags_to_set"] = tags_or_error(organization, attrs["tag_ids"])
        return attrs

    def create(self, validated_data):
        tags = validated_data.pop("tags_to_set", [])
        validated_data.pop("tag_ids", None)
        validated_data.pop("customer_id", None)
        validated_data.pop("assignee_id", None)
        organization = validated_data["organization"]
        with transaction.atomic():
            Organization.objects.select_for_update().get(pk=organization.pk)
            current = Ticket.objects.filter(organization=organization).aggregate(Max("number"))
            validated_data["number"] = (current["number__max"] or 1000) + 1
            apply_resolution_timestamp(validated_data, previous=None)
            ticket = Ticket(**validated_data)
            enforce_clean(ticket)
            ticket.save()
            replace_tags(ticket, tags, self.context["request"].user)
        return ticket

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags_to_set", None)
        validated_data.pop("tag_ids", None)
        validated_data.pop("customer_id", None)
        validated_data.pop("assignee_id", None)
        apply_resolution_timestamp(validated_data, previous=instance)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.version += 1
        enforce_clean(instance)
        instance.save()
        if tags is not None:
            replace_tags(instance, tags, self.context["request"].user)
        return instance


class TicketDetailSerializer(TicketSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    activity = serializers.SerializerMethodField()
    analysis = serializers.SerializerMethodField()

    class Meta(TicketSerializer.Meta):
        fields = TicketSerializer.Meta.fields + ["comments", "activity", "analysis"]

    def get_activity(self, ticket: Ticket):
        logs = (
            ActivityLog.objects.filter(
                organization_id=ticket.organization_id,
                entity_type=ActivityLog.EntityType.TICKET,
                entity_id=ticket.id,
            )
            .select_related("actor")
            .order_by("-created_at")
        )
        return ActivitySerializer(logs, many=True).data

    def get_analysis(self, ticket: Ticket):
        latest = ticket.ai_analyses.order_by("-created_at").first()
        completed = (
            ticket.ai_analyses.filter(status="completed").order_by("-created_at").first()
        )
        if (
            latest is not None
            and latest.status == "failed"
            and (completed is None or latest.created_at >= completed.created_at)
        ):
            return {
                "status": "failed",
                "error_message": latest.error_message,
            }
        if completed is None:
            return {"status": latest.status} if latest is not None else None
        return {
            "status": "completed",
            "category": completed.category,
            "priority": completed.priority,
            "sentiment": completed.sentiment,
            "summary": completed.summary,
            "suggested_tags": completed.suggested_tags,
            "confidence": (completed.raw_response or {}).get("confidence", 0),
            "model_name": completed.model_name,
            "created_at": completed.created_at,
        }


def member_or_error(organization, user_id):
    if user_id is None:
        return None
    membership = (
        Membership.objects.select_related("user")
        .filter(
            organization=organization,
            user_id=user_id,
            accepted_at__isnull=False,
        )
        .first()
    )
    if membership is None:
        raise serializers.ValidationError(
            {"assignee_id": "Assignee must be a member of this workspace."}
        )
    return membership.user


def tags_or_error(organization, tag_ids):
    tags = list(Tag.objects.filter(organization=organization, pk__in=tag_ids))
    if len(tags) != len(set(tag_ids)):
        raise serializers.ValidationError(
            {"tag_ids": "Every tag must belong to this workspace."}
        )
    return tags


def replace_tags(ticket: Ticket, tags, user):
    ticket.ticket_tags.all().delete()
    TicketTag.objects.bulk_create(
        [
            TicketTag(ticket=ticket, tag=tag, added_by=user)
            for tag in tags
        ]
    )


def apply_resolution_timestamp(validated_data, previous: Ticket | None):
    status = validated_data.get("status", previous.status if previous else Ticket.Status.NEW)
    if status in {Ticket.Status.RESOLVED, Ticket.Status.CLOSED}:
        if previous is None or previous.resolved_at is None:
            validated_data["resolved_at"] = timezone.now()
        return
    if previous is not None and "status" in validated_data:
        validated_data["resolved_at"] = None


def enforce_clean(instance):
    try:
        instance.full_clean()
    except DjangoValidationError as exc:
        if hasattr(exc, "message_dict"):
            raise serializers.ValidationError(exc.message_dict) from exc
        raise serializers.ValidationError(exc.messages) from exc
