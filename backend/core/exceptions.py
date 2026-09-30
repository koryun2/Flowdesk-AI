import logging

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger("flowdesk.api")


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    request = context.get("request")
    method = getattr(request, "method", "-")
    path = getattr(request, "path", "-")

    if response is None:
        logger.exception("Unhandled API error on %s %s", method, path)
        detail = str(exc) if settings.DEBUG else "Something went wrong. Please try again."
        return Response({"detail": detail}, status=500)

    if response.status_code >= 500:
        logger.error("API %s %s %s", response.status_code, method, path)
    return response
