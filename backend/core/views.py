from django.db import OperationalError, connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"service": "flowdesk-api", "status": "ok"})


@api_view(["GET"])
@permission_classes([AllowAny])
def readiness_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except OperationalError:
        return Response({"service": "flowdesk-api", "status": "unavailable"}, status=503)
    return Response({"service": "flowdesk-api", "status": "ok", "database": "ok"})
