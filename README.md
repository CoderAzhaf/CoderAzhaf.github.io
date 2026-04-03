# CoderAzhaf Vercel Setup

This project now supports all three pieces together:

- A cleaner static frontend for the main site pages
- Express-powered backend APIs on Vercel through `api/[...all].js`
- Persistent storage on Vercel through Upstash Redis REST env vars

## Local development

1. Install dependencies with `npm install`
2. Start the site with `npm run dev`
3. Open `http://localhost:3000`

Local development stores data in:

- `accounts.json`
- `messages.json`
- `balances.json`

## Vercel deployment

1. Import the project into Vercel
2. Set these environment variables from `.env.example`
3. Redeploy the project

Required env vars for persistent storage:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_KEY_PREFIX` optional

Without those env vars, Vercel can still run the backend, but data persistence will fall back to local files and will not be reliable between deployments.

## API routes

The backend is available through these routes:

- `GET /api/health`
- `GET /api/site-summary`
- `POST /api/signup`
- `POST /api/login`
- `GET /api/users`
- `GET /api/messages`
- `POST /api/messages`
- `PUT /api/messages/:id/read`
- `DELETE /api/messages/:id`
- `GET /api/balances`
- admin routes under `/api/admin/*`

## Quick validation

Run:

```bash
npm run check
```

That confirms the server loads successfully.
