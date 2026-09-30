# Flowdesk AI

Portfolio notes for the operations workspace. The README case study is the description of how the system actually works. This file keeps the same boundaries.

## Stack

- Frontend: React 18, TypeScript, Vite
- API: Django, Django REST Framework, JWT, drf-spectacular
- AI service: FastAPI, Pydantic
- Data: PostgreSQL 17 with pgvector
- Local development: Docker Compose, Redis reserved in the topology

Redis is started by Compose and is not read by application code. There is no Celery worker. The interface is custom CSS, not Tailwind.

## AI boundary

FastAPI returns structured results. Django stores them.

- Ticket analysis writes an `AIAnalysis` row after the model returns category, priority, summary, sentiment, and suggested tags.
- Knowledge retrieval chunks a document, stores embeddings, and answers from the retrieved chunks with sources.
- The agent planner chooses one of six tools. Django runs reads immediately and holds writes until the same user approves them.

Without `GEMINI_API_KEY`, those three paths use the local models `flowdesk-local`, `flowdesk-local-embed`, and `flowdesk-local-agent`. With a key, they use Gemini.

## Run

Development:

```bash
cp .env.example .env
docker compose up --build
```

Web app: http://localhost:5173  
API reference: http://localhost:8000/api/v1/docs/  
AI reference: http://localhost:8001/docs

Production, on port 8080, with a real secret and database password:

```bash
docker compose -f compose.prod.yaml up --build
```

Demo account after seeding: `koryun@flowdesk.ai` / `flowdesk`.
