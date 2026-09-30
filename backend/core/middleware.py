import logging
import time
import uuid

logger = logging.getLogger("flowdesk.request")


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.perf_counter()
        request_id = (request.headers.get("X-Request-ID") or "")[:64] or uuid.uuid4().hex[:12]
        request.request_id = request_id
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        if request.path.startswith("/api/"):
            elapsed_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "%s %s %s %s %.0fms",
                request_id,
                request.method,
                request.path,
                response.status_code,
                elapsed_ms,
            )
        return response
