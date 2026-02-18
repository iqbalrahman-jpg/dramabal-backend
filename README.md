# dramabal-backend

Next.js backend bridge service.

## Endpoints

- `GET /list`: calls upstream `GET {PARENT_API_BASE_URL}/list`, maps response, then returns normalized result.
- `GET /health`: basic health check.

## Setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Update `PARENT_API_BASE_URL` in `.env.local`.

3. Install dependencies and run dev server:

```bash
npm install
npm run dev
```

Server will run at `http://localhost:3000`.

## Mapping behavior for `/list`

Upstream payload supports these common keys: `data`, `items`, or `results`.
Each item is transformed into:

```json
{
  "id": "...",
  "name": "...",
  "status": "...",
  "createdAt": "..."
}
```
