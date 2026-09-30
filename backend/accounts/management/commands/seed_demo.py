from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from ai_ops.models import AIAnalysis
from audit.models import ActivityLog
from customers.models import Customer
from organizations.models import Membership, Organization
from knowledge.services import index_document, prepare_document
from tickets.models import Comment, Tag, Ticket, TicketTag

DEMO_EMAIL = "koryun@flowdesk.ai"
DEMO_PASSWORD = "flowdesk"


class Command(BaseCommand):
    help = "Create the local demo workspace, owner, and sample operations data."

    def handle(self, *args, **options):
        owner = ensure_user(
            DEMO_EMAIL,
            "Koryun",
            "A.",
            password=DEMO_PASSWORD,
        )
        organization, _ = Organization.objects.get_or_create(
            slug="flowdesk-labs",
            defaults={"name": "Flowdesk Labs"},
        )
        Membership.objects.get_or_create(
            organization=organization,
            user=owner,
            defaults={"role": Membership.Role.OWNER, "accepted_at": timezone.now()},
        )
        teammates = {
            "maya": ensure_member(organization, "maya@flowdesk.ai", "Maya", "Chen", Membership.Role.AGENT),
            "leo": ensure_member(organization, "leo@flowdesk.ai", "Leo", "Martins", Membership.Role.AGENT),
            "nora": ensure_member(organization, "nora@flowdesk.ai", "Nora", "Patel", Membership.Role.ADMIN),
        }
        if not organization.customers.exists():
            seed_workspace(organization, owner, teammates)
        if not organization.knowledge_documents.exists():
            seed_knowledge(organization, owner, teammates)
        self.stdout.write(self.style.SUCCESS(f"Demo account ready: {DEMO_EMAIL}"))


def seed_knowledge(organization, owner, teammates):
    guides = [
        (
            "Export limits and large dataset guide",
            "file",
            "export-limits.md",
            "",
            (
                "Customers should export datasets above 50,000 rows through the background export endpoint, "
                "then poll the job until a signed download URL is returned. Export links remain active for 24 hours. "
                "Smaller exports can download immediately. The worker keeps a separate timeout from interactive requests, "
                "so a large CSV export no longer fails when the row count crosses 50,000."
            ),
            teammates["maya"],
        ),
        (
            "API authentication",
            "url",
            "",
            "https://docs.flowdesk.ai/api/authentication",
            (
                "API requests authenticate with a bearer token issued for the workspace. "
                "Send the token in the Authorization header. Background jobs accept the same credentials "
                "and return a job identifier that clients can poll until the result is ready."
            ),
            owner,
        ),
        (
            "Workspace roles and permissions",
            "text",
            "",
            "",
            (
                "Workspace roles are viewer, agent, admin, and owner. Viewers can read tickets and knowledge. "
                "Agents can update tickets and add knowledge sources. Admins can delete records. "
                "Owners manage membership. Every change is stored in the audit log for that organization."
            ),
            teammates["nora"],
        ),
        (
            "Billing and subscription FAQ",
            "text",
            "",
            "",
            (
                "Invoices show the plan that was active during the billing period. After an upgrade, "
                "the next invoice uses the new plan. Payment failures retry automatically, and the billing "
                "page lists the current subscription, renewal date, and the last payment status."
            ),
            teammates["nora"],
        ),
        (
            "Webhooks troubleshooting",
            "url",
            "",
            "https://docs.flowdesk.ai/webhooks/troubleshooting",
            (
                "Webhook deliveries retry after a failed response. If retries stop, confirm the endpoint "
                "returns a 2xx status and that the signing secret matches the workspace configuration. "
                "The delivery log shows the last response code for each event."
            ),
            teammates["leo"],
        ),
    ]
    for title, source_type, file_name, source_url, content, author in guides:
        document = prepare_document(
            organization,
            title,
            source_type,
            content,
            source_url=source_url,
            file_name=file_name,
            created_by=author,
        )
        index_document(document, remote=False)


def ensure_user(email, first_name, last_name, password=None):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={"first_name": first_name, "last_name": last_name, "is_active": True},
    )
    if created:
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(update_fields=["password"])
    return user


def ensure_member(organization, email, first_name, last_name, role):
    user = ensure_user(email, first_name, last_name)
    Membership.objects.get_or_create(
        organization=organization,
        user=user,
        defaults={"role": role, "accepted_at": timezone.now()},
    )
    return user


def seed_workspace(organization, owner, teammates):
    now = timezone.now()
    customers = {
        "marcus": customer(
            organization,
            "Marcus Lee",
            "marcus@lumon.co",
            "Lumon",
            "+1 212 555 0146",
            "Growth",
            "at_risk",
            9600,
            "Experiencing recurring CSV export issues. Follow up this week.",
            now - timedelta(hours=28),
        ),
        "amelia": customer(
            organization,
            "Amelia Rodriguez",
            "amelia@northstar.io",
            "Northstar Labs",
            "+1 415 555 0182",
            "Enterprise",
            "healthy",
            28400,
            "Strategic account. Expansion conversation planned for Q4.",
            now - timedelta(hours=2),
        ),
        "ethan": customer(
            organization,
            "Ethan Brooks",
            "ethan@meridian.dev",
            "Meridian",
            "",
            "Enterprise",
            "critical",
            41800,
            "Escalated account. Weekly engineering sync is active.",
            now - timedelta(hours=72),
        ),
        "sofia": customer(
            organization,
            "Sofia Anders",
            "sofia@orbital.design",
            "Orbital Design",
            "",
            "Growth",
            "healthy",
            7200,
            "Product champion. Interested in beta programs.",
            now - timedelta(hours=6),
        ),
        "yuki": customer(
            organization,
            "Yuki Tanaka",
            "yuki@kaizen.app",
            "Kaizen",
            "",
            "Starter",
            "healthy",
            1800,
            "Recently completed onboarding.",
            now - timedelta(hours=1),
        ),
        "owen": customer(
            organization,
            "Owen Wright",
            "owen@cedar.finance",
            "Cedar Finance",
            "",
            "Enterprise",
            "healthy",
            53600,
            "Security-conscious financial services customer.",
            now - timedelta(hours=4),
        ),
    }
    tags = {
        "export": tag(organization, "export", "#4F46E5"),
        "bug": tag(organization, "bug", "#DC2626"),
        "api": tag(organization, "api", "#0891B2"),
        "billing": tag(organization, "billing", "#D97706"),
        "feature": tag(organization, "feature", "#7C3AED"),
        "onboarding": tag(organization, "onboarding", "#059669"),
    }
    export_ticket = ticket(
        organization,
        customers["marcus"],
        teammates["maya"],
        owner,
        1284,
        "CSV export fails for datasets over 50k rows",
        "Every export above roughly 50,000 rows ends with a generic timeout message. Smaller exports work normally.",
        Ticket.Status.INVESTIGATING,
        Ticket.Priority.URGENT,
        Ticket.Source.EMAIL,
        now - timedelta(hours=3),
        [tags["export"], tags["bug"]],
    )
    Comment.objects.create(
        ticket=export_ticket,
        author=teammates["maya"],
        body="I reproduced this with a 72k row dataset. The worker hits its current execution limit.",
        is_internal=True,
    )
    Comment.objects.create(
        ticket=export_ticket,
        author=owner,
        body="Thanks, Marcus. We have isolated the issue and are testing a fix now.",
        is_internal=False,
    )
    ActivityLog.objects.create(
        organization=organization,
        action="analyzed ticket",
        entity_type=ActivityLog.EntityType.TICKET,
        entity_id=export_ticket.id,
        context={
            "actor_name": "Flowdesk AI",
            "detail": "Classified as an urgent product bug",
            "tone": "ai",
        },
    )
    AIAnalysis.objects.create(
        organization=organization,
        ticket=export_ticket,
        status=AIAnalysis.Status.COMPLETED,
        category=AIAnalysis.Category.BUG,
        priority=Ticket.Priority.URGENT,
        sentiment=AIAnalysis.Sentiment.NEGATIVE,
        summary="Large CSV exports time out above 50,000 rows. This is blocking a finance reconciliation workflow.",
        suggested_tags=["export", "bug"],
        model_name="flowdesk-classifier",
        raw_response={"confidence": 0.96},
        finished_at=now - timedelta(hours=2, minutes=50),
    )
    ticket(
        organization,
        customers["ethan"],
        teammates["leo"],
        owner,
        1271,
        "Webhook retries stop after the second failure",
        "Meridian's billing webhooks are not retried after the second 500 response.",
        Ticket.Status.WAITING,
        Ticket.Priority.HIGH,
        Ticket.Source.API,
        now - timedelta(hours=20),
        [tags["api"], tags["bug"]],
    )
    ticket(
        organization,
        customers["amelia"],
        teammates["nora"],
        owner,
        1262,
        "Need audit history on role changes",
        "Northstar wants a downloadable history of membership and permission changes.",
        Ticket.Status.NEW,
        Ticket.Priority.MEDIUM,
        Ticket.Source.WEB,
        now - timedelta(hours=8),
        [tags["feature"]],
    )
    ticket(
        organization,
        customers["sofia"],
        None,
        owner,
        1258,
        "Invoice shows the previous plan after upgrade",
        "The latest invoice still lists Growth after the account moved to Enterprise.",
        Ticket.Status.INVESTIGATING,
        Ticket.Priority.HIGH,
        Ticket.Source.EMAIL,
        now - timedelta(days=2),
        [tags["billing"]],
    )
    ticket(
        organization,
        customers["yuki"],
        teammates["maya"],
        owner,
        1244,
        "Onboarding checklist cannot be dismissed",
        "The checklist remains after every item is complete.",
        Ticket.Status.RESOLVED,
        Ticket.Priority.LOW,
        Ticket.Source.WEB,
        now - timedelta(days=4),
        [tags["onboarding"]],
        resolved_at=now - timedelta(days=1),
    )
    ticket(
        organization,
        customers["owen"],
        teammates["leo"],
        owner,
        1230,
        "SSO login loops for finance administrators",
        "Cedar Finance administrators return to the login screen after a successful identity provider response.",
        Ticket.Status.NEW,
        Ticket.Priority.URGENT,
        Ticket.Source.EMAIL,
        now - timedelta(hours=6),
        [tags["bug"]],
    )
    ticket(
        organization,
        customers["amelia"],
        owner,
        owner,
        1218,
        "Add a weekly operations digest",
        "Northstar asked for a Monday digest of open, urgent, and recently resolved tickets.",
        Ticket.Status.CLOSED,
        Ticket.Priority.LOW,
        Ticket.Source.WEB,
        now - timedelta(days=9),
        [tags["feature"]],
        resolved_at=now - timedelta(days=6),
    )
    ticket(
        organization,
        customers["marcus"],
        teammates["nora"],
        owner,
        1190,
        "Export download link expires too quickly",
        "Signed export links expire before the finance team can download them.",
        Ticket.Status.WAITING,
        Ticket.Priority.MEDIUM,
        Ticket.Source.WEB,
        now - timedelta(days=1),
        [tags["export"]],
    )


def customer(organization, name, email, company, phone, plan, health, lifetime_value, notes, updated_at):
    record = Customer.objects.create(
        organization=organization,
        name=name,
        email=email,
        company=company,
        phone=phone,
        notes=notes,
        metadata={"plan": plan, "health": health, "lifetime_value": lifetime_value},
    )
    Customer.objects.filter(pk=record.pk).update(updated_at=updated_at)
    return record


def tag(organization, name, color):
    return Tag.objects.create(organization=organization, name=name, color=color)


def ticket(
    organization,
    customer_record,
    assignee,
    created_by,
    number,
    title,
    description,
    status,
    priority,
    source,
    created_at,
    tags,
    resolved_at=None,
):
    record = Ticket.objects.create(
        organization=organization,
        customer=customer_record,
        assignee=assignee,
        created_by=created_by,
        number=number,
        title=title,
        description=description,
        status=status,
        priority=priority,
        source=source,
        resolved_at=resolved_at,
    )
    Ticket.objects.filter(pk=record.pk).update(created_at=created_at, updated_at=created_at)
    TicketTag.objects.bulk_create(
        [
            TicketTag(ticket=record, tag=item, added_by=created_by)
            for item in tags
        ]
    )
    ActivityLog.objects.create(
        organization=organization,
        actor=created_by,
        action="created ticket",
        entity_type=ActivityLog.EntityType.TICKET,
        entity_id=record.id,
        context={"detail": title},
        created_at=created_at,
    )
    return record
