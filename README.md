# dramabal-backend

Next.js backend bridge service.

## Endpoints

- `GET /server/list`: returns hardcoded app source list (local only, no upstream call).
- `GET /server/:app/list`: calls upstream `GET {PARENT_API_BASE_URL}/:app/list`, maps response, then returns normalized result.
- `GET /health`: basic health check.

## Setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Update `PARENT_API_BASE_URL` and `PARENT_API_TOKEN` in `.env.local`.

3. Install dependencies and run dev server:

```bash
npm install
npm run dev
```

Server will run at `http://localhost:3000`.

## App source list

`GET /server/list` returns:

```json
{
  "items": ["HiShort", "MicroDrama", "..."],
  "total": 24
}
```

## Mapping behavior for `/server/:app/list`

Upstream payload supports keys: `data`, `items`, or `results`.
Each item is transformed into:

```json
{
  "id": "...",
  "name": "...",
  "status": "...",
  "createdAt": "..."
}
```
