import json
import re
from datetime import timedelta
from uuid import UUID, uuid4

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from accounts.permissions import ROLE_RANK
from audit.models import ActivityLog
from audit.services import record_activity
from customers.models import Customer
from knowledge.services import answer_question
from organizations.models import ANALYSIS_MODELS, Membership
from tickets.models import Ticket
from tickets.serializers import CommentSerializer, TicketSerializer
from tickets.views import OPEN_STATUSES, ticket_search

from .agent_client import AgentAIError, request_plan
from .models import AgentAction, AgentConversation, AgentMessage


READ_TOOLS = {"search_tickets", "get_customer", "search_knowledge_base"}
WRITE_TOOLS = {"create_ticket", "update_ticket", "add_ticket_comment"}
TICKET_STATUSES = set(Ticket.Status.values)
TICKET_PRIORITIES = set(Ticket.Priority.values)


class _Actor:
    def __init__(self, user, membership):
        self.user = user
        self.membership = membership


def run_turn(user, membership, message: str, prior: str = "", conversation_id=None) -> dict:
    context = _planner_context(user, membership, conversation_id)
    model = membership.organization.analysis_model
    if model not in ANALYSIS_MODELS:
        model = ANALYSIS_MODELS[0]
    try:
        plan = request_plan(message, context or prior[:4000], model)
    except AgentAIError as exc:
        raise ValidationError({"message": str(exc)}) from exc
    tool_calls = []
    for call in (plan.get("tool_calls") or [])[:4]:
        if not isinstance(call, dict):
            continue
        name = str(call.get("name") or "")
        arguments = call.get("arguments") if isinstance(call.get("arguments"), dict) else {}
        if name in READ_TOOLS:
            tool_calls.append(_read_tool(name, arguments, membership))
        elif name in WRITE_TOOLS:
            tool_calls.append(_prepare_write(name, arguments, user, membership))
    reply = _reply(plan.get("reply") or "", tool_calls)
    with transaction.atomic():
        conversation = _conversation(user, membership, message, conversation_id)
        AgentMessage.objects.create(
            conversation=conversation,
            role=AgentMessage.Role.USER,
            content=message,
        )
        assistant = AgentMessage.objects.create(
            conversation=conversation,
            role=AgentMessage.Role.ASSISTANT,
            content=reply,
            tool_calls=tool_calls,
        )
        conversation.save(update_fields=["updated_at"])
    return {
        "id": str(assistant.id),
        "role": "assistant",
        "content": reply,
        "created_at": assistant.created_at,
        "model_name": plan.get("model_name") or "",
        "tool_calls": tool_calls,
        "conversation_id": str(conversation.id),
    }


def approve_action(user, membership, action_id) -> dict:
    action = _pending_action(user, membership, action_id)
    if not _can_write(membership):
        raise PermissionDenied("Your workspace role cannot change tickets.")
    try:
        result = _execute_write(action, user, membership)
    except ValidationError as exc:
        action.status = AgentAction.Status.FAILED
        action.result = _error_text(exc)
        action.finished_at = timezone.now()
        action.save(update_fields=["status", "result", "finished_at", "updated_at"])
        raise
    action.status = AgentAction.Status.COMPLETED
    action.result = result
    action.finished_at = timezone.now()
    action.save(update_fields=["status", "result", "finished_at", "updated_at"])
    payload = _tool_payload(action, "completed", result)
    _remember_tool(user, membership, payload)
    return payload


def cancel_action(user, membership, action_id) -> dict:
    action = _pending_action(user, membership, action_id)
    action.status = AgentAction.Status.CANCELLED
    action.result = "Cancelled before any data changed."
    action.finished_at = timezone.now()
    action.save(update_fields=["status", "result", "finished_at", "updated_at"])
    payload = _tool_payload(action, "cancelled", action.result)
    _remember_tool(user, membership, payload)
    return payload


def _read_tool(name: str, arguments: dict, membership) -> dict:
    organization = membership.organization
    if name == "search_tickets":
        result = _search_tickets(organization, arguments)
    elif name == "get_customer":
        result = _get_customers(organization, arguments)
    else:
        result = _search_knowledge(organization, arguments)
    return {
        "id": str(uuid4()),
        "name": name,
        "status": "completed",
        "input": _input_text(arguments),
        "result": result,
    }


def _prepare_write(name: str, arguments: dict, user, membership) -> dict:
    if not _can_write(membership):
        return {
            "id": str(uuid4()),
            "name": name,
            "status": "completed",
            "input": _input_text(arguments),
            "result": "Your role can look up workspace data. An agent needs to apply changes.",
        }
    try:
        stored = _validated_write(name, arguments, membership)
    except ValidationError as exc:
        return {
            "id": str(uuid4()),
            "name": name,
            "status": "completed",
            "input": _input_text(arguments),
            "result": _error_text(exc),
        }
    action = AgentAction.objects.create(
        organization=membership.organization,
        actor=user,
        tool_name=name,
        arguments=stored,
        status=AgentAction.Status.PENDING,
    )
    if membership.organization.require_agent_approval:
        return _tool_payload(action, "approval_required", "Waiting for approval before anything changes.")
    try:
        result = _execute_write(action, user, membership)
    except ValidationError as exc:
        action.status = AgentAction.Status.FAILED
        action.result = _error_text(exc)
        action.finished_at = timezone.now()
        action.save(update_fields=["status", "result", "finished_at", "updated_at"])
        return _tool_payload(action, "completed", action.result)
    action.status = AgentAction.Status.COMPLETED
    action.result = result
    action.finished_at = timezone.now()
    action.save(update_fields=["status", "result", "finished_at", "updated_at"])
    return _tool_payload(action, "completed", result)


def _search_tickets(organization, arguments: dict) -> str:
    queryset = Ticket.objects.filter(organization=organization).select_related("customer")
    query = str(arguments.get("query") or "").strip()
    status_value = str(arguments.get("status") or "").strip()
    priority = str(arguments.get("priority") or "").strip()
    within = arguments.get("created_within_days")
    has_window = isinstance(within, int) and 1 <= within <= 30
    if not query and not status_value and priority not in TICKET_PRIORITIES and not has_window:
        return "Tell me which tickets to look for, such as export bugs or urgent tickets."
    if query:
        matched = queryset.filter(ticket_search(query))
        if matched.exists():
            queryset = matched
        else:
            words = [
                word
                for word in re.findall(r"[a-z0-9]{3,}", query.lower())
                if word not in {"bug", "bugs", "ticket", "tickets", "issue", "issues"}
            ]
            if not words:
                return "No tickets matched that search."
            word_query = Q()
            for word in words:
                word_query |= ticket_search(word)
            queryset = queryset.filter(word_query)
    if status_value == "open":
        queryset = queryset.filter(status__in=OPEN_STATUSES)
    elif status_value in TICKET_STATUSES:
        queryset = queryset.filter(status=status_value)
    if priority in TICKET_PRIORITIES:
        queryset = queryset.filter(priority=priority)
    if has_window:
        start = timezone.now() - timedelta(days=within)
        queryset = queryset.filter(created_at__gte=start)
    tickets = list(queryset.order_by("-created_at")[:5])
    if not tickets:
        return "No tickets matched that search."
    rendered = "; ".join(
        f"{_ticket_link(ticket)} {ticket.title} ({ticket.priority}, {ticket.status})"
        for ticket in tickets
    )
    noun = "ticket" if len(tickets) == 1 else "tickets"
    about = f" about {query}" if query else ""
    return f"Found {len(tickets)} {noun}{about}: {rendered}."


def _get_customers(organization, arguments: dict) -> str:
    queryset = Customer.objects.filter(organization=organization).annotate(
        open_tickets=Count("tickets", filter=Q(tickets__status__in=OPEN_STATUSES))
    )
    scope = str(arguments.get("scope") or "").strip()
    health = str(arguments.get("health") or "").strip()
    query = str(arguments.get("query") or "").strip()
    if scope != "all":
        if health == "at_risk":
            queryset = queryset.filter(metadata__health__in=["at_risk", "critical"])
        elif health in {"healthy", "critical"}:
            queryset = queryset.filter(metadata__health=health)
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) | Q(email__icontains=query) | Q(company__icontains=query)
            )
        if not health and not query:
            return "Say which customer to look up."
    total = queryset.count()
    customers = list(queryset.order_by("name")[:8])
    if scope == "all" and total == 0:
        return "This workspace has no customers yet."
    if not customers:
        return "No customer matched that search."
    rendered = "; ".join(
        (
            f"{customer.name} at {customer.company or 'an unknown company'} "
            f"({customer.email or 'no email'}) is {(customer.metadata or {}).get('health', 'healthy').replace('_', ' ')} "
            f"on the {(customer.metadata or {}).get('plan', 'Growth')} plan, with {customer.open_tickets} open tickets"
        )
        for customer in customers
    )
    if scope == "all":
        noun = "customer" if total == 1 else "customers"
        hidden = total - len(customers)
        extra = f" and {hidden} more" if hidden else ""
        return f"This workspace has {total} {noun}: {rendered}{extra}."
    return rendered + "."


def _search_knowledge(organization, arguments: dict) -> str:
    question = str(arguments.get("question") or arguments.get("query") or "").strip()
    if len(question) < 3:
        return "Ask a complete knowledge question."
    answer = answer_question(organization, question)
    sources = ", ".join(source["title"] for source in answer["sources"]) or "no matching source"
    return f"{answer['answer']} Source: {sources}."


def _validated_write(name: str, arguments: dict, membership) -> dict:
    organization = membership.organization
    if name == "create_ticket":
        customer = _one_customer(organization, str(arguments.get("customer") or ""))
        title = str(arguments.get("title") or "").strip()
        description = str(arguments.get("description") or "").strip()
        priority = str(arguments.get("priority") or "medium").strip()
        if len(title) < 5:
            raise ValidationError({"title": "The ticket title needs at least 5 characters."})
        if len(description) < 15:
            raise ValidationError({"description": "The ticket description needs at least 15 characters."})
        if priority not in TICKET_PRIORITIES:
            priority = Ticket.Priority.MEDIUM
        return {
            "display": {
                "customer": customer.name,
                "title": title,
                "priority": priority,
            },
            "customer_id": str(customer.id),
            "title": title,
            "description": description,
            "priority": priority,
        }
    if name == "update_ticket":
        ticket = _one_ticket(organization, str(arguments.get("ticket") or ""))
        changes = {"ticket_id": str(ticket.id), "display": {"ticket": _ticket_key(ticket)}}
        status_value = str(arguments.get("status") or "").strip()
        priority = str(arguments.get("priority") or "").strip()
        if status_value:
            if status_value not in TICKET_STATUSES:
                raise ValidationError({"status": "Choose a valid ticket status."})
            changes["status"] = status_value
            changes["display"]["status"] = status_value
        if priority:
            if priority not in TICKET_PRIORITIES:
                raise ValidationError({"priority": "Choose a valid priority."})
            changes["priority"] = priority
            changes["display"]["priority"] = priority
        assignee = str(arguments.get("assignee") or "").strip()
        if assignee:
            member = _one_member(organization, assignee)
            changes["assignee_id"] = str(member.user_id)
            changes["display"]["assignee"] = member.user.email
        if len(changes) == 2:
            raise ValidationError({"ticket": "Say what should change on the ticket."})
        return changes
    ticket = _one_ticket(organization, str(arguments.get("ticket") or ""))
    body = str(arguments.get("body") or "").strip()
    if not body:
        raise ValidationError({"body": "Comment text is required."})
    return {
        "display": {"ticket": _ticket_key(ticket), "body": body[:180]},
        "ticket_id": str(ticket.id),
        "body": body,
        "is_internal": bool(arguments.get("is_internal")),
    }


def _execute_write(action: AgentAction, user, membership) -> str:
    actor = _Actor(user, membership)
    arguments = action.arguments or {}
    if action.tool_name == "create_ticket":
        serializer = TicketSerializer(
            data={
                "title": arguments["title"],
                "description": arguments["description"],
                "customer_id": arguments["customer_id"],
                "priority": arguments["priority"],
                "source": Ticket.Source.AGENT,
            },
            context={"request": actor},
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(organization=membership.organization, created_by=user)
        from ai_ops.services import analyze_ticket

        if membership.organization.auto_analyze_tickets:
            analyze_ticket(ticket)
        record_activity(
            organization=membership.organization,
            actor=user,
            action="created ticket",
            entity_type=ActivityLog.EntityType.TICKET,
            entity_id=ticket.id,
            context={"detail": ticket.title, "source": "agent"},
        )
        return f"Created {_ticket_link(ticket)} {ticket.title}."
    if action.tool_name == "update_ticket":
        ticket = _ticket_for_action(membership.organization, arguments["ticket_id"])
        payload = {}
        if arguments.get("status"):
            payload["status"] = arguments["status"]
        if arguments.get("priority"):
            payload["priority"] = arguments["priority"]
        if arguments.get("assignee_id"):
            payload["assignee_id"] = arguments["assignee_id"]
        serializer = TicketSerializer(ticket, data=payload, partial=True, context={"request": actor})
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        record_activity(
            organization=membership.organization,
            actor=user,
            action="updated ticket",
            entity_type=ActivityLog.EntityType.TICKET,
            entity_id=ticket.id,
            context={"detail": _ticket_key(ticket), "source": "agent"},
        )
        return f"Updated {_ticket_link(ticket)}."
    ticket = _ticket_for_action(membership.organization, arguments["ticket_id"])
    serializer = CommentSerializer(
        data={"body": arguments["body"], "is_internal": arguments.get("is_internal", False)},
        context={"request": actor, "ticket": ticket},
    )
    serializer.is_valid(raise_exception=True)
    comment = serializer.save(ticket=ticket, author=user)
    record_activity(
        organization=membership.organization,
        actor=user,
        action="added internal note" if comment.is_internal else "replied to customer",
        entity_type=ActivityLog.EntityType.TICKET,
        entity_id=ticket.id,
        context={"detail": comment.body[:180], "source": "agent"},
    )
    return f"Added a comment on {_ticket_link(ticket)}."


def _one_customer(organization, query: str) -> Customer:
    if not query:
        raise ValidationError({"customer": "Say which customer the ticket is for."})
    matches = Customer.objects.filter(organization=organization).filter(
        Q(name__icontains=query) | Q(email__icontains=query) | Q(company__icontains=query)
    )
    if matches.count() != 1:
        raise ValidationError({"customer": "Name one customer in this workspace."})
    return matches.get()


def _ticket_for_action(organization, ticket_id) -> Ticket:
    ticket = Ticket.objects.filter(organization=organization, pk=ticket_id).first()
    if ticket is None:
        raise ValidationError({"ticket": "That ticket is no longer available."})
    return ticket


def _one_ticket(organization, label: str) -> Ticket:
    label = label.strip()
    number = label.upper().removeprefix("FD-")
    queryset = Ticket.objects.filter(organization=organization)
    if number.isdigit():
        ticket = queryset.filter(number=int(number)).first()
        if ticket is not None:
            return ticket
        raise ValidationError({"ticket": f"{label.upper()} is not in this workspace."})
    matches = queryset.filter(title__icontains=label) if label else queryset.none()
    if matches.count() != 1:
        raise ValidationError({"ticket": "Name one ticket, such as FD-1284."})
    return matches.get()


def _one_member(organization, query: str) -> Membership:
    matches = Membership.objects.select_related("user").filter(
        organization=organization,
        accepted_at__isnull=False,
    ).filter(Q(user__email__icontains=query) | Q(user__first_name__icontains=query) | Q(user__last_name__icontains=query))
    if matches.count() != 1:
        raise ValidationError({"assignee": "Name one workspace member."})
    return matches.get()


def _pending_action(user, membership, action_id) -> AgentAction:
    action = AgentAction.objects.filter(
        organization=membership.organization,
        actor=user,
        pk=action_id,
    ).first()
    if action is None:
        raise NotFound("That action is not available.")
    if action.status != AgentAction.Status.PENDING:
        raise ValidationError({"action": "This action is no longer pending."})
    if not _can_write(membership):
        raise PermissionDenied("Your workspace role cannot change tickets.")
    return action


def _planner_context(user, membership, conversation_id) -> str:
    if not conversation_id:
        return ""
    try:
        parsed = UUID(str(conversation_id))
    except (TypeError, ValueError):
        return ""
    conversation = AgentConversation.objects.filter(
        pk=parsed,
        organization=membership.organization,
        actor=user,
    ).first()
    if conversation is None:
        return ""
    messages = list(conversation.messages.order_by("-created_at")[:8])
    lines = []
    for message in reversed(messages):
        text = re.sub(r"\s+", " ", message.content).strip()[:400]
        if not text:
            continue
        role = "User" if message.role == AgentMessage.Role.USER else "Assistant"
        lines.append(f"{role}: {text}")
    return "\n".join(lines)[:4000]


def _conversation(user, membership, message: str, conversation_id) -> AgentConversation:
    if conversation_id:
        try:
            parsed = UUID(str(conversation_id))
        except (TypeError, ValueError):
            raise ValidationError({"conversation_id": "Choose one of your conversations."})
        conversation = AgentConversation.objects.filter(
            pk=parsed,
            organization=membership.organization,
            actor=user,
        ).first()
        if conversation is None:
            raise ValidationError({"conversation_id": "Choose one of your conversations."})
        return conversation
    title = re.sub(r"\s+", " ", message).strip()[:80] or "Conversation"
    return AgentConversation.objects.create(
        organization=membership.organization,
        actor=user,
        title=title,
    )


def _remember_tool(user, membership, payload: dict) -> None:
    needle = str(payload["id"])
    messages = AgentMessage.objects.filter(
        conversation__organization=membership.organization,
        conversation__actor=user,
        role=AgentMessage.Role.ASSISTANT,
    ).order_by("-created_at")[:30]
    for message in messages:
        calls = list(message.tool_calls or [])
        matched = False
        for call in calls:
            if str(call.get("id")) == needle:
                call["status"] = payload["status"]
                call["result"] = payload["result"]
                matched = True
        if matched:
            message.tool_calls = calls
            message.save(update_fields=["tool_calls", "updated_at"])
            return


def _reply(fallback: str, tool_calls: list[dict]) -> str:
    parts = [call["result"] for call in tool_calls if call.get("result")]
    if parts:
        return " ".join(parts)
    text = str(fallback).strip()
    return text or "I could not match that request to a workspace tool."


def _tool_payload(action: AgentAction, status: str, result: str) -> dict:
    display = (action.arguments or {}).get("display") or {}
    return {
        "id": str(action.id),
        "name": action.tool_name,
        "status": status,
        "input": _input_text(display),
        "result": result,
    }


def _input_text(arguments: dict) -> str:
    return json.dumps(arguments, sort_keys=True, default=str)


def _ticket_key(ticket: Ticket) -> str:
    return f"FD-{ticket.number}"


def _ticket_link(ticket: Ticket) -> str:
    return f"[{_ticket_key(ticket)}](/tickets/{ticket.id})"


def _can_write(membership) -> bool:
    return ROLE_RANK[membership.role] >= ROLE_RANK[Membership.Role.AGENT]


def _error_text(exc: ValidationError) -> str:
    detail = exc.detail
    if isinstance(detail, dict):
        first = next(iter(detail.values()))
        if isinstance(first, list):
            return str(first[0])
        return str(first)
    if isinstance(detail, list):
        return str(detail[0])
    return str(detail)
