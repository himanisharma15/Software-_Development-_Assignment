# Email Job Scheduler Service + Dashboard

A production-style monorepo for scheduling outbound emails with Redis-delayed jobs, Postgres persistence, Elasticsearch search, OAuth login, and a Slack notification flow.

## Stack

- Backend: TypeScript, Express, Prisma, BullMQ, Redis, PostgreSQL, Elasticsearch, Passport Google OAuth, Nodemailer Ethereal
- Frontend: React + TypeScript + Vite + Tailwind + React Query + React Router
- Infra: Docker Compose for Redis, PostgreSQL, and Elasticsearch

## Repository structure

- `backend/` — API, queue workers, Prisma schema, reusable services
- `frontend/` — React dashboard and auth flows
- `docker-compose.yml` — Redis / Postgres / Elasticsearch
- `README.md` — usage and architecture notes

## Quick start

1. Copy env files:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env`
2. Start infra:
   ```bash
   docker compose up -d
   ```
3. Generate Prisma client and apply migrations:
   ```bash
   cd backend
   npx prisma generate
   npm run migrate
   ```
4. Start the API server:
   ```bash
   npm run dev --workspace backend
   ```
5. Start the worker:
   ```bash
   npm run start:worker --workspace backend
   ```
6. Start the frontend:
   ```bash
   npm run dev --workspace frontend
   ```
7. Open http://localhost:5173 and log in with Google.

## Required environment setup

### Backend

See `backend/.env.example` for the complete variable list.

Key values:

- `PORT=4000`
- `FRONTEND_URL=http://localhost:5173`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/email_scheduler?schema=public`
- `REDIS_URL=redis://localhost:6379`
- `ELASTICSEARCH_URL=http://localhost:9200`
- `JWT_SECRET=<strong random secret>`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`
- `WORKER_CONCURRENCY=4`
- `MIN_DELAY_BETWEEN_EMAILS_MS=2000`
- `MAX_EMAILS_PER_HOUR_PER_SENDER=100`
- `SENDER_COUNT=3`
- `BULL_BOARD_USER=admin`
- `BULL_BOARD_PASS=admin`

### Frontend

Copy `frontend/.env.example` to `frontend/.env` and ensure:

```bash
VITE_API_URL=http://localhost:4000/api
```

## Google OAuth setup

1. Create a Google Cloud project and enable the Google Identity API.
2. Create OAuth 2.0 client credentials.
3. Add an authorized redirect URI:
   - `http://localhost:4000/api/auth/google/callback`
   - Production: `https://software-development-assignment.vercel.app/api/auth/google/callback`
4. Set the values in `backend/.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback`
5. Log in through the button on the frontend; the backend sets the JWT cookie and redirects to `/dashboard`.

For production, configure these backend environment values on Render:

```bash
FRONTEND_URL=https://software-development-assignment.vercel.app
GOOGLE_CALLBACK_URL=https://software-development-assignment.vercel.app/api/auth/google/callback
```

The production frontend sends API requests through Vercel's `/api` rewrite so the session cookie stays first-party.

## Slack app setup

1. Create a Slack app in api.slack.com.
2. Add OAuth scopes:
   - `incoming-webhook`
   - `chat:write`
   - `channels:read`
3. Set redirect URL:
   - `http://localhost:4000/api/slack/callback`
4. Populate `backend/.env` with the app credentials.
5. Use the Connect Slack button in the dashboard to authorize the app.

## Ethereal Email setup

This app seeds Ethereal SMTP test accounts at startup and stores them in Postgres so outbound jobs can be sent through disposable test accounts. The app supports multiple accounts and round-robins across configured senders.

## Architecture and scheduling flow

```mermaid
flowchart TD
  A[Frontend Compose modal] --> B[POST /api/emails/schedule]
  B --> C[Validate leads + insert DB rows]
  C --> D[Queue email-queue jobs with BullMQ delay]
  D --> E[Worker picks up job]
  E --> F[Atomic DB claim + Redis lock]
  F --> G[Rate limiter check by sender/hour]
  G --> H{Limit hit?}
  H -- yes --> I[moveToDelayed next hour window + DelayedError]
  H -- no --> J[SMTP send via Ethereal sender]
  J --> K[status=sent, update ES, DB]
  I --> L[Update scheduledAt + ES]
  M[Redis AOF + Postgres] --> N[reconcile on startup]
  N --> O[Recreate missing jobs from scheduled rows]
  P[Slack webhook] --> Q[Notify when sender hourly ceiling is reached]
```

### How delayed jobs work

- Scheduling is done with BullMQ delayed jobs, not cron or polling loops.
- Each email gets a unique `jobId` and is inserted into Postgres with a scheduled timestamp.
- The delay is computed as `startTime + index * delayBetweenMs` minus current time, clamped to zero.
- On restart, the queue rehydrates delayed jobs from Redis, while the app also runs a reconciliation routine that checks for Postgres rows with no corresponding queue job and re-enqueues them.

### Idempotency guarantee

- Every scheduled email row carries a unique `jobId`.
- The worker first performs an atomic DB claim: it updates email status only when the row is still in a retry-able state.
- A Redis lock (`sent:{emailId}`) prevents duplicate job processing across workers.
- The queue uses the same `jobId` for retry/reschedule, preventing duplicate sends.

### Concurrency and rate limiting

- Worker concurrency is controlled by `WORKER_CONCURRENCY`.
- The minimum send gap is enforced by BullMQ limiter configuration and uses `MIN_DELAY_BETWEEN_EMAILS_MS` (default 2000ms).
- Hourly rate limiting uses Redis counters per sender and hour window, backed by atomic increment logic. If the sender hits its cap, the job is rescheduled into the next hour window with `moveToDelayed` and marked as delayed instead of failed.

### Slack notification flow

- Looks up the sender owner and checks whether their Slack connection exists.
- Uses the connected webhook URL or `chat.postMessage` when available.
- Failures are caught and swallowed so email delivery is never blocked by Slack issues.
- Notification deduplication is enforced with a Redis key per sender per hour window.

### Elasticsearch indexing

- An `emails` index is created on startup.
- The index includes text fields for `to`, `subject`, `body`, and keyword fields for `status`, `userId`, and `senderId`.
- Search requests go through the `GET /api/emails/search` endpoint and query the index for fast filtering and full-text lookup.

## Behavior under load

The queue is designed for burst scheduling. For a batch of 1000+ emails scheduled at the same moment:

- the DB inserts are batched,
- jobs are created with a shared start time and delayed offsets,
- the hourly limiter spreads jobs across time windows automatically,
- the worker enforces the per-sender minimum delay,
- deduplication and atomic claims protect against duplicate sends.

## Feature checklist

### Backend

- Scheduler: delayed BullMQ jobs, dynamic scheduling, per-email jobId
- Persistence: Postgres schema, Redis AOF, startup reconciliation
- Rate limiting: Redis atomic per-sender hourly windows and delayed requeue
- Concurrency: configurable worker concurrency and BullMQ limiter
- Search: Elasticsearch index creation and search API
- Bull Board: queue dashboard at `/admin/queues`
- Slack: OAuth connection, status, disconnect, notifier

### Frontend

- Login: Google login and auth guard
- Dashboard: tabs for scheduled vs sent emails
- Compose: modal, lead upload, parsed count, scheduling form
- Tables: status badges, live refresh, pagination
- Slack connection: status badge and connect/disconnect actions

## Assumptions and trade-offs

- Ethereal is used for SMTP delivery in development/test mode and is not production-safe.
- The demo app uses a single default user for the initial seed when no user exists yet; real OAuth should create the user on first Google sign-in.
- Search is intentionally minimal and optimized for the provided dashboard requirements.
- Slack notifications are best-effort and will never block email processing.

## Demo flow

1. Start Redis/Postgres/Elasticsearch with Docker.
2. Log in with Google from the frontend.
3. Create or seed Ethereal senders with the backend endpoint.
4. Open the compose modal and schedule a campaign with CSV or text leads.
5. Observe the live table updates and queue dashboard at `/admin/queues`.
6. Trigger rate limiting by scheduling > 100 emails per sender per hour.
7. Restart the API/worker and observe the reconcile logic re-enqueue scheduled jobs.

## Scripts

- `npm run dev --workspace backend` — Start the API server
- `npm run start:worker --workspace backend` — Start the BullMQ worker
- `npm run build --workspace backend` — Compile backend TypeScript
- `npm run build --workspace frontend` — Compile frontend Vite app
- `npm run reindex --workspace backend` — Rebuild Elasticsearch index from Postgres
- `npm run seed:demo --workspace backend` — Seed 1000+ demo jobs for load testing
