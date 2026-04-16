# Automatic Facebook Page Post Publishing Platform

Production-ready full-stack implementation using:

- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Backend:** Express + Prisma + BullMQ
- **Worker:** BullMQ queue processor
- **DB:** PostgreSQL
- **Queue:** Redis
- **Storage:** Cloudinary
- **Auth:** JWT + Facebook OAuth

## Project structure

```text
fb-posting-platform/
  backend/
  frontend/
  worker/
  IMPLEMENTATION_PLAN.pdf
```

## Features implemented

1. Secure user register/login with JWT.
2. Facebook OAuth connect flow with required page permissions.
3. Long-lived token handling and token encryption at rest.
4. Page discovery and page selection persistence.
5. Post creation (text/image/optional link) + scheduling.
6. Delayed queue jobs (BullMQ) with retries (3 attempts).
7. Worker auto-publishes to `/feed` or `/photos`.
8. Status tracking: `pending`, `published`, `failed`.
9. API rate limiting + input validation.
10. Bonus: AI caption endpoint + hashtag fallback + post preview UI.

## Setup instructions

1. **Backend**
   1. `cd backend`
   2. `copy .env.example .env` and fill all env vars
   3. `npm install`
   4. `npx prisma generate`
   5. `npx prisma migrate dev --name init`
   6. `npm run dev`

2. **Worker**
   1. `cd worker`
   2. `copy .env.example .env` (use same DB, Redis, encryption key)
   3. `npm install`
   4. `npm run dev`

3. **Frontend**
   1. `cd frontend`
   2. `copy .env.example .env.local`
   3. `npm install`
   4. `npm run dev`

## Required env vars (summary)

### backend/.env
- `DATABASE_URL`
- `JWT_SECRET`
- `TOKEN_ENCRYPTION_KEY` (>=32 chars)
- `FB_APP_ID`, `FB_APP_SECRET`, `FB_REDIRECT_URI`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `REDIS_HOST`, `REDIS_PORT`
- `FRONTEND_URL`
- `OPENAI_API_KEY` (optional)

### worker/.env
- `DATABASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `REDIS_HOST`, `REDIS_PORT`
- `FB_APP_ID`, `FB_APP_SECRET`

### frontend/.env.local
- `NEXT_PUBLIC_API_URL`

## API endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Facebook
- `GET /api/facebook/connect`
- `GET /api/facebook/callback`
- `GET /api/facebook/pages`
- `POST /api/facebook/pages/select`

### Posts
- `POST /api/posts`
- `GET /api/posts`
- `DELETE /api/posts/:id`
- `POST /api/posts/ai-caption`

## curl usage examples

### Register
```bash
curl -X POST http://localhost:4000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"StrongPass123\"}"
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@example.com\",\"password\":\"StrongPass123\"}"
```

### Get Facebook connect URL
```bash
curl http://localhost:4000/api/facebook/connect ^
  -H "Authorization: Bearer YOUR_JWT"
```

### List pages
```bash
curl http://localhost:4000/api/facebook/pages ^
  -H "Authorization: Bearer YOUR_JWT"
```

### Schedule post (text only)
```bash
curl -X POST http://localhost:4000/api/posts ^
  -H "Authorization: Bearer YOUR_JWT" ^
  -F "pageId=YOUR_INTERNAL_PAGE_ID" ^
  -F "content=Launching our spring campaign!" ^
  -F "scheduledAt=2026-12-24T08:30:00.000Z"
```

### Schedule post (with image + link)
```bash
curl -X POST http://localhost:4000/api/posts ^
  -H "Authorization: Bearer YOUR_JWT" ^
  -F "pageId=YOUR_INTERNAL_PAGE_ID" ^
  -F "content=New product just dropped." ^
  -F "linkUrl=https://example.com/new-product" ^
  -F "scheduledAt=2026-12-24T08:30:00.000Z" ^
  -F "image=@C:\\path\\banner.png"
```

### List posts
```bash
curl http://localhost:4000/api/posts ^
  -H "Authorization: Bearer YOUR_JWT"
```

### Delete post
```bash
curl -X DELETE http://localhost:4000/api/posts/POST_ID ^
  -H "Authorization: Bearer YOUR_JWT"
```

## Testing

- Mocked Facebook API sample test is included:
  - `backend/tests/facebook.service.test.js`
- Run:
  - `cd backend`
  - `npm test`

## Notes for production

- Use managed Redis and PostgreSQL.
- Use HTTPS and secure cookie/token transport at your edge.
- Add centralized logging (e.g., pino + ELK/Sentry).
- Add BullMQ dashboard (Bull Board) if desired.
