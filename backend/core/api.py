from rest_framework.exceptions import APIException, ValidationError


class Conflict(APIException):
    status_code = 409
    default_detail = "This record cannot be changed because related data depends on it."
    default_code = "conflict"


def ordered(queryset, ordering: str | None, allowed: dict[str, str], default: str):
    if not ordering:
        return queryset.order_by(default, "id")
    field = allowed.get(ordering)
    if field is None:
        raise ValidationError({"ordering": "Unsupported sort field."})
    return queryset.order_by(field, "id")
