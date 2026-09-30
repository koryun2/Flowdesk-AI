from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from organizations.models import Membership, Organization


def workspace(
    *,
    role=Membership.Role.OWNER,
    email="owner@example.com",
    slug="labs",
    first_name="Ada",
):
    user = User.objects.create_user(
        email=email,
        password="Flowdesk-Test-Pass-91",
        first_name=first_name,
        last_name="Ops",
    )
    organization = Organization.objects.create(name=slug.replace("-", " ").title(), slug=slug)
    Membership.objects.create(
        organization=organization,
        user=user,
        role=role,
        accepted_at=timezone.now(),
    )
    client = APIClient()
    client.force_authenticate(user)
    return client, user, organization
