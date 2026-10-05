from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase

from accounts.models import User
from accounts.permissions import HasMinimumRole
from organizations.models import Membership, Organization


class AuthenticationTests(APITestCase):
    def test_register_creates_owner_workspace_and_tokens(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "name": "Ada Lovelace",
                "email": "Ada@Example.com",
                "password": "Flowdesk-Test-Pass-91",
                "workspace_name": "Analytical Engines",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        user = User.objects.get(email="ada@example.com")
        membership = user.memberships.get()
        self.assertEqual(membership.role, Membership.Role.OWNER)
        self.assertEqual(membership.organization.name, "Analytical Engines")
        self.assertIsNotNone(membership.accepted_at)

    def test_register_rejects_duplicate_email_and_weak_password(self):
        User.objects.create_user(email="ada@example.com", password="correct-horse-battery")

        duplicate = self.client.post(
            reverse("auth-register"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "password": "Flowdesk-Test-Pass-91",
                "workspace_name": "Another Workspace",
            },
            format="json",
        )
        weak = self.client.post(
            reverse("auth-register"),
            {
                "name": "Grace Hopper",
                "email": "grace@example.com",
                "password": "password",
                "workspace_name": "Compilers",
            },
            format="json",
        )

        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="grace@example.com").exists())

    def test_login_and_protected_profile(self):
        self._register()

        denied = self.client.get(reverse("auth-me"))
        login = self.client.post(
            reverse("auth-token"),
            {"email": "ada@example.com", "password": "Flowdesk-Test-Pass-91"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        profile = self.client.get(reverse("auth-me"))
        organizations = self.client.get(reverse("organization-list"))

        self.assertEqual(denied.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.data["email"], "ada@example.com")
        self.assertEqual(organizations.data[0]["role"], "owner")
        self.assertEqual(organizations.data[0]["slug"], "analytical-engines")

    def test_wrong_password_is_rejected(self):
        self._register()
        response = self.client.post(
            reverse("auth-token"),
            {"email": "ada@example.com", "password": "not-the-password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_workspace_list_is_limited_to_memberships(self):
        self._register()
        outsider = User.objects.create_user(
            email="outsider@example.com",
            password="correct-horse-battery",
        )
        other = Organization.objects.create(name="Private Org", slug="private-org")
        Membership.objects.create(
            organization=other,
            user=outsider,
            role=Membership.Role.OWNER,
            accepted_at=timezone.now(),
        )
        login = self.client.post(
            reverse("auth-token"),
            {"email": "ada@example.com", "password": "Flowdesk-Test-Pass-91"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = self.client.get(reverse("organization-list"))

        self.assertEqual([item["slug"] for item in response.data], ["analytical-engines"])

    def test_minimum_role_permission(self):
        organization = Organization.objects.create(name="Role Check", slug="role-check")
        viewer = User.objects.create_user(email="viewer@example.com", password="correct-horse-battery")
        agent = User.objects.create_user(email="agent@example.com", password="correct-horse-battery")
        Membership.objects.create(
            organization=organization,
            user=viewer,
            role=Membership.Role.VIEWER,
            accepted_at=timezone.now(),
        )
        Membership.objects.create(
            organization=organization,
            user=agent,
            role=Membership.Role.AGENT,
            accepted_at=timezone.now(),
        )
        view = type("AgentView", (), {"required_role": Membership.Role.AGENT})()
        factory = APIRequestFactory()

        viewer_request = factory.get("/")
        viewer_request.user = viewer
        agent_request = factory.get("/")
        agent_request.user = agent

        permission = HasMinimumRole()
        self.assertFalse(permission.has_permission(viewer_request, view))
        self.assertTrue(permission.has_permission(agent_request, view))

    def test_profile_and_password_changes_persist(self):
        self._register()
        login = self.client.post(
            reverse("auth-token"),
            {"email": "ada@example.com", "password": "Flowdesk-Test-Pass-91"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        profile = self.client.patch(
            reverse("auth-me"),
            {
                "first_name": "Ada",
                "last_name": "Byron",
                "email": "ada.byron@example.com",
                "timezone": "Asia/Yerevan",
            },
            format="json",
        )
        wrong = self.client.post(
            reverse("auth-password"),
            {"current_password": "nope", "new_password": "Flowdesk-Next-Pass-91"},
            format="json",
        )
        changed = self.client.post(
            reverse("auth-password"),
            {
                "current_password": "Flowdesk-Test-Pass-91",
                "new_password": "Flowdesk-Next-Pass-91",
            },
            format="json",
        )
        self.client.credentials()
        old_login = self.client.post(
            reverse("auth-token"),
            {"email": "ada.byron@example.com", "password": "Flowdesk-Test-Pass-91"},
            format="json",
        )
        new_login = self.client.post(
            reverse("auth-token"),
            {"email": "ada.byron@example.com", "password": "Flowdesk-Next-Pass-91"},
            format="json",
        )

        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.data["last_name"], "Byron")
        self.assertEqual(profile.data["timezone"], "Asia/Yerevan")
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(changed.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(old_login.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(new_login.status_code, status.HTTP_200_OK)

    def test_health_endpoint_stays_public(self):
        response = self.client.get(reverse("health-check"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _register(self):
        return self.client.post(
            reverse("auth-register"),
            {
                "name": "Ada Lovelace",
                "email": "ada@example.com",
                "password": "Flowdesk-Test-Pass-91",
                "workspace_name": "Analytical Engines",
            },
            format="json",
        )
