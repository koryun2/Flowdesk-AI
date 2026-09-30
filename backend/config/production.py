from django.core.exceptions import ImproperlyConfigured

UNSAFE_SECRET_KEYS = {
    "unsafe-development-key",
    "unsafe-local-compose-key",
    "replace-with-a-long-random-value",
}


def validate_production_settings(*, environment: str, debug: bool, secret_key: str, allowed_hosts: list[str]) -> None:
    """Refuse a production process that is still using development defaults."""
    if environment != "production":
        return
    if debug:
        raise ImproperlyConfigured("DJANGO_DEBUG must be false when DJANGO_ENV is production.")
    if secret_key in UNSAFE_SECRET_KEYS or len(secret_key) < 32:
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY to a unique value of at least 32 characters.")
    if not allowed_hosts or "*" in allowed_hosts:
        raise ImproperlyConfigured("Set DJANGO_ALLOWED_HOSTS to the public host names.")
