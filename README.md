# dramabal-backend

Next.js backend bridge service with unified product endpoints.

## Endpoints

- `GET /v1/server/list`: returns hardcoded app source list (local only).
- `GET /v1/:app/dashboard`: product dashboard cards.
- `GET /v1/:app/search?name=...`: product search.
- `GET /v1/:app/detail/:id`: drama detail with episode list.
- `GET /v1/:app/episodes/:id`: episode list for a drama id.
- `GET /v1/:app/episode/:slug`: episode video detail (title + url).
- `GET /health`: basic health check.

## Setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Update `.env.local`:

- `PARENT_API_TOKEN` (required)
- `HISHORT_API_BASE_URL` (optional, default: `https://captain.sapimu.au/hishort/api/v1`)

3. Install and run:

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3000`.

## Current provider support

- Implemented: `HiShort`
- Implemented: `MicroDrama`
- Other apps in `/v1/server/list` currently return `501 Not Implemented` for product routes.

## Normalized response shapes

Card items (`dashboard` + `search`):

```json
{
  "id": "5034",
  "title": "Romance of Shanghai",
  "thumbnail": "https://...jpg"
}
```

Episode detail:

```json
{
  "id": "3688_1",
  "title": "Episode 1",
  "url": "https://...m3u8"
}
```

Episode list items (inside `detail` and `episodes`) include `url` as well:

```json
{
  "id": "3688_1",
  "number": 1,
  "url": "https://...m3u8"
}
```
