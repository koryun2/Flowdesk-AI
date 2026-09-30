# Flowdesk frontend

React 18, TypeScript, and Vite client for the Flowdesk AI operations platform.

## Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. API calls go to `/api` and the Vite dev server proxies them to Django (`VITE_API_PROXY_TARGET`, default `http://localhost:8000`).

The production image builds the same app and nginx proxies `/api`, `/admin`, and `/static` to Django, so the browser stays on one origin.

## Main routes

- `/` — operations dashboard
- `/tickets` and `/tickets/:id` — ticket queue and details
- `/customers` and `/customers/:id` — customer directory and profiles
- `/knowledge` — document management and source-cited answers
- `/agent` — controlled AI tool console
- `/settings` — profile, workspace, AI, integrations, and security
- `/login` and `/register` — authentication entry points

## Quality checks

```bash
npm run lint
npm test
npm run build
```
