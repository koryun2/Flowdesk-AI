# Flowdesk data model

Every tenant-owned record is scoped to an `Organization`. Users join
organizations through `Membership`, which stores their role.

```text
User ──< Membership >── Organization
                           ├──< Customer ──< Ticket
                           │                  ├──< Comment
                           │                  ├──< TicketTag >── Tag
                           │                  └──< AIAnalysis
                           ├──< KnowledgeDocument ──< KnowledgeChunk
                           └──< ActivityLog
```

## Design rules

- Domain records use UUID primary keys and UTC timestamps.
- Tenant-scoped uniqueness prevents collisions between organizations.
- Foreign-key deletion policies preserve ticket history where appropriate.
- Database checks protect ticket lifecycle and AI analysis state transitions.
- Composite indexes support common tenant, status, assignee, and time filters.
- Cross-tenant relationships are rejected by model validation and will also be
  enforced at the API boundary.
- Activity logs are read-only in Django admin.

Knowledge documents are split into chunks. Each chunk stores a 128-dimension
embedding. PostgreSQL also keeps that vector in a pgvector column so retrieval
can use cosine distance. SQLite tests rank the same embeddings in process.

## Authentication

The API uses short-lived JWT access tokens and rotating refresh tokens.

| Method | Endpoint | Access |
| --- | --- | --- |
| POST | `/api/v1/auth/register/` | Public |
| POST | `/api/v1/auth/token/` | Public |
| POST | `/api/v1/auth/token/refresh/` | Public |
| GET | `/api/v1/auth/me/` | Authenticated |
| GET | `/api/v1/organizations/` | Workspace member |
| GET | `/api/v1/health/` | Public process check |
| GET | `/api/v1/ready/` | Public check that the database answers |

Registration creates the user, organization, and owner membership together.
Protected requests send `Authorization: Bearer <access-token>`. When a user
belongs to multiple workspaces, `X-Organization-Id` selects the membership used
for role checks. Roles rank from viewer to agent, admin, and owner.

## Operations API

Customers, tickets, comments, and tags are scoped to the caller's workspace.
Viewers can read. Agents can create and update. Admins can delete. Lists are
paginated and accept `search`, `ordering`, and `page_size` (maximum 100).

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET, POST | `/api/v1/customers/` | List or create customers |
| GET, PATCH, DELETE | `/api/v1/customers/{id}/` | Retrieve, update, or delete a customer |
| GET | `/api/v1/customers/summary/` | Workspace customer counts |
| GET, POST | `/api/v1/tickets/` | List or create tickets |
| GET, PATCH, DELETE | `/api/v1/tickets/{id}/` | Retrieve, update, or delete a ticket |
| POST | `/api/v1/tickets/{id}/comments/` | Add a reply or internal note |
| GET | `/api/v1/tickets/summary/` | Open, urgent, and resolved counts |
| POST | `/api/v1/tickets/{id}/analyze/` | Run ticket analysis again |
| GET, POST | `/api/v1/tags/` | List or create tags |
| GET | `/api/v1/members/` | Workspace members for assignment |
| GET, POST | `/api/v1/documents/` | List or add knowledge sources |
| POST | `/api/v1/documents/ask/` | Answer a question from indexed sources |
| GET | `/api/v1/documents/summary/` | Source, ready, and chunk counts |
| POST | `/api/v1/agent/turns/` | Ask the operations agent to use its tools |
| POST | `/api/v1/agent/actions/{id}/approve/` | Apply a prepared ticket change |
| POST | `/api/v1/agent/actions/{id}/cancel/` | Discard a prepared ticket change |

Ticket list filters are `status`, `priority`, `assignee` (`unassigned` for none),
`customer`, `tag`, and `search`. Search matches the title, description, customer,
and ticket key such as `FD-1284`. Sort with `ordering`, for example
`-created_at` or `-priority`. Deleting a customer that still has tickets returns
409. Ticket numbers are assigned per workspace and shown as `FD-{number}`.

## Ticket analysis

Creating a ticket sends its title, description, and customer to the FastAPI
service at `POST /v1/analyses/tickets`. The response is stored as an
`AIAnalysis` row: category, priority, summary, sentiment, and suggested tags.
The ticket page shows that result. FastAPI does not write application tables.

If the AI service is unavailable, the ticket is still created and the page can
retry with `POST /api/v1/tickets/{id}/analyze/`.

Without `GEMINI_API_KEY`, the service uses a local classifier named
`flowdesk-local`. When a key is set, it asks Gemini for the same structured JSON.
