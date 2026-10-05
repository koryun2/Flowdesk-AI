from django.utils import timezone
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import HasMinimumRole

from .models import Notification


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumRole]

    def get(self, request):
        rows = Notification.objects.filter(
            organization=request.membership.organization,
            recipient=request.user,
        ).order_by("-created_at")[:50]
        unread = Notification.objects.filter(
            organization=request.membership.organization,
            recipient=request.user,
            read_at__isnull=True,
        ).count()
        return Response(
            {
                "unread_count": unread,
                "results": [_payload(row) for row in rows],
            }
        )


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated, HasMinimumRole]

    def post(self, request, notification_id=None):
        queryset = Notification.objects.filter(
            organization=request.membership.organization,
            recipient=request.user,
            read_at__isnull=True,
        )
        if notification_id is not None:
            if not Notification.objects.filter(
                pk=notification_id,
                organization=request.membership.organization,
                recipient=request.user,
            ).exists():
                raise NotFound("That notification is not available.")
            queryset = queryset.filter(pk=notification_id)
        queryset.update(read_at=timezone.now())
        return Response(status=204)


def _payload(row: Notification) -> dict:
    return {
        "id": str(row.id),
        "title": row.title,
        "detail": row.detail,
        "tone": row.tone,
        "link": row.link,
        "read": row.read_at is not None,
        "created_at": row.created_at,
    }
