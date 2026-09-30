# Flowdesk AI

Flowdesk is an AI product-operations workspace. Support teams keep customers, tickets, and internal knowledge in one place, and the AI features sit behind the same permissions as the rest of the API.

The web app is React, TypeScript, and Vite. Django REST Framework owns accounts, workspace data, and permissions. FastAPI returns structured AI results and does not write application tables. PostgreSQL stores the relational data and, through pgvector, the knowledge embeddings.

## Case study

### The constraint

A chatbot that can write the database is not an operations tool. Flowdesk splits the work: the model may classify a ticket, rank documentation, or propose a tool call. Django decides whether that result is stored, who is allowed to see it, and whether a write waits for a person.

### Architecture

```text
Browser
  |
  |  same origin in production (nginx proxies /api)
  v
React application
  |
  |  JWT access token, optional X-Organization-Id
  v
Django REST API -------------------- PostgreSQL 17 + pgvector
  |                                      |
  |  validated tool execution            +-- organizations, tickets, chunks
  |
  +-- Redis (present in Compose, unused by application code)
  |
  v
FastAPI AI service
  |
  +-- local models when GEMINI_API_KEY is empty
  +-- Gemini structured output when a key is set
```

Each request is logged with a request id, method, path, status, and duration. `/api/v1/health/` checks that the API process is up. `/api/v1/ready/` checks that PostgreSQL answers. The AI service exposes `/health` and `/ready`. Production containers use those endpoints as Docker health checks.

### Ticket analysis

Automatic analysis is off until an admin turns it on under Settings. Anyone can still open a ticket and choose Analyze ticket. The seeded ticket FD-1284 already has a stored analysis.

Analysis sends the title, description, and customer to `POST /v1/analyses/tickets`. The response is a fixed shape: category, suggested priority, summary, sentiment, and suggested tags. Django stores it as an `AIAnalysis` row and the ticket page renders it. Suggested priority does not change the ticket. If the AI service fails, the ticket still exists and the page can retry.

Without an API key the classifier is `flowdesk-local`. With a key, the same JSON schema is requested from the configured chat model. The default model is `gemma-4-26b-a4b-it`.

### Knowledge retrieval

A document is text, an uploaded file, or a URL. Django extracts the text, rejects private URL targets, splits the text into overlapping chunks, and stores a 128-dimension embedding on each chunk. PostgreSQL also keeps that vector in a pgvector column with an HNSW index.

A question is embedded, the closest chunks are ranked with a mix of cosine similarity and lexical overlap, and the answer is generated from those chunks only. The API returns the sources with the answer. Seeded documents are indexed locally so the database can start before the AI service is listening. Later requests try FastAPI and fall back to the local embedding model.

### The operations agent

The agent can search tickets, look up a customer, search the knowledge base, create a ticket, update a ticket, and add a comment. FastAPI `POST /v1/agent/plan` only chooses the tool and its arguments. Django executes the plan and writes the reply from those results.

Reads run immediately. Ticket keys in a reply link to the ticket. Writes are validated first. A valid write is stored as a pending `AgentAction` for the signed-in user. Approve runs the same ticket and comment serializers as the REST API, then writes an activity log with the human as the actor. Cancel stores nothing. An admin can turn off that approval step in Settings, and valid writes then run immediately. Viewers can ask questions. Applying a change requires an agent role. Another workspace cannot approve the action.

Conversations are stored for the signed-in user in that workspace. Opening a ticket and coming back keeps the list.

### Tenancy and access

Every domain record belongs to an organization. Roles rank from viewer to agent, admin, and owner. Access tokens last 30 minutes. Refresh tokens rotate for 7 days. The production process refuses to start when `DJANGO_ENV=production` and the secret key is still a development placeholder, debug is on, or `ALLOWED_HOSTS` is empty or `*`.

## Run the development stack

You need Docker Desktop with Docker Compose. The first start builds the images, applies migrations, and loads the demo workspace. Later starts reuse that database.

1. From the repository root, copy the env file if you do not already have one.

   macOS or Linux:

   ```bash
   cp .env.example .env
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Leave `GEMINI_API_KEY` empty to use the local classifier, embeddings, and agent planner. To use Gemini, paste a key into `.env` and keep `GEMINI_MODEL=gemma-4-26b-a4b-it`.

3. Start the stack:

   ```bash
   docker compose up --build
   ```

   The API is ready when the backend log says the development server is listening on port 8000. The first run takes a few minutes.

4. Open http://localhost:5173 and sign in.

   Demo login: `koryun@flowdesk.ai` / `flowdesk`, workspace Flowdesk Labs.

| Service | URL |
| --- | --- |
| Web app | http://localhost:5173 |
| Django API health | http://localhost:8000/api/v1/health/ |
| Django API readiness | http://localhost:8000/api/v1/ready/ |
| Django admin | http://localhost:8000/admin/ |
| API reference | http://localhost:8000/api/v1/docs/ |
| OpenAPI schema | http://localhost:8000/api/v1/schema/ |
| FastAPI health | http://localhost:8001/health |
| FastAPI reference | http://localhost:8001/docs |

PostgreSQL is on port 5432 and Redis is on port 6379. Django and the AI service mount the local source and reload when it changes. The development database password is `flowdesk`, from `.env.example`.

Compose reads `.env`, and a variable already set in the terminal wins over that file. If this terminal was used for the production stack, clear `POSTGRES_PASSWORD` and `DJANGO_SECRET_KEY` first, or the development database will reject the password.

PowerShell:

```powershell
Remove-Item Env:POSTGRES_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:DJANGO_SECRET_KEY -ErrorAction SilentlyContinue
```

macOS or Linux:

```bash
unset POSTGRES_PASSWORD DJANGO_SECRET_KEY
```

Stop the stack with `docker compose down`. That keeps the database. `docker compose down -v` deletes it, and the next start seeds the demo again.

After you change `GEMINI_API_KEY` or `GEMINI_MODEL` in `.env`, recreate the AI container so it picks up the new values:

```bash
docker compose up -d --no-deps --force-recreate ai-service
```

A useful walkthrough:

1. Open ticket FD-1284 and read the stored category, priority, summary, and sentiment.
2. On Knowledge, ask how a customer should export a dataset over 50,000 rows and check the cited source.
3. On Agent, ask `Find unresolved export bugs`. Reads return immediately, and ticket keys are links.
4. Ask for a ticket change, then use Cancel. Nothing is written until Approve.

This repository does not include screenshots. The walkthrough above is the demo.

## Run the production stack

`compose.prod.yaml` is a separate Compose project named `flowdesk-prod`. It has its own database volume, does not mount source code, and does not publish PostgreSQL or Redis. nginx serves the built frontend on port 8080 and proxies `/api`, `/admin`, and `/static` to Django. Django runs under gunicorn. The AI service runs under uvicorn without reload.

Use a new terminal for these commands so the secrets do not leak into a later development `docker compose up`.

1. Set a secret of at least 32 characters and a database password. Set `SEED_DEMO` to `true` when you want the portfolio demo account. A real deployment leaves `SEED_DEMO` unset, which keeps it false.

   PowerShell:

   ```powershell
   $env:DJANGO_SECRET_KEY = "replace-with-your-own-secret-at-least-32-chars"
   $env:POSTGRES_PASSWORD = "replace-with-a-database-password"
   $env:SEED_DEMO = "true"
   ```

   macOS or Linux:

   ```bash
   export DJANGO_SECRET_KEY="replace-with-your-own-secret-at-least-32-chars"
   export POSTGRES_PASSWORD="replace-with-a-database-password"
   export SEED_DEMO=true
   ```

2. Build and start:

   ```bash
   docker compose -f compose.prod.yaml up --build
   ```

3. Open http://localhost:8080. With `SEED_DEMO=true`, the login is the same demo account as development.

The production process will not start while `DJANGO_SECRET_KEY` is missing, shorter than 32 characters, or still a development placeholder. `POSTGRES_PASSWORD` is required.

`GEMINI_API_KEY` stays optional. An empty key keeps classification, embeddings, and the agent planner on the local models. With a key, those calls use Gemini. You can put the key in `.env` or export it in the same terminal before `docker compose`.

Behind TLS, set `WEB_ORIGIN` to the public `https` origin, `DJANGO_ALLOWED_HOSTS` to the host name, and `DJANGO_SECURE_COOKIES=true`.

## Quality checks

GitHub Actions (`.github/workflows/ci.yml`) runs the Django suite, the AI-service tests, the frontend lint, unit tests, and production build, and applies Django migrations to PostgreSQL with pgvector.

To run the same checks locally, create a virtualenv at the repository root, then:

```powershell
.\.venv\Scripts\python -m pip install -r backend\requirements.txt -r ai-service\requirements.txt
.\.venv\Scripts\python backend\manage.py test
$env:PYTHONPATH = "ai-service"
.\.venv\Scripts\python -m unittest discover -s ai-service/tests
cd frontend
npm ci
npm test
npm run lint
npm run build
```

On macOS or Linux, call `.venv/bin/python` and set `PYTHONPATH=ai-service` for the AI-service tests.

## Configuration

Copy `.env.example` to `.env` for local overrides. Never commit `.env` or a real API key. The development stack can keep the placeholder secret. The production stack will not start with that placeholder.
