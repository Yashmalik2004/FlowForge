# TaskFlow

TaskFlow is a distributed background job queue for submitting long-running or resource-intensive tasks through a REST API and processing them asynchronously. It is designed for work such as sending emails, resizing images, generating PDFs, and notifying the caller with an optional webhook after completion.

TaskFlow uses durable queue and database storage, but it does not claim true exactly-once execution. The supported production guarantee is at-least-once processing with clear job state, retries, and idempotency-friendly handler design.

## How It Works

- Submit a job via `POST /api/jobs`.
- TaskFlow writes the job to PostgreSQL and enqueues it in BullMQ backed by Redis.
- Workers pull jobs in priority order and execute the registered handler for the job's `taskType`.
- On completion or final failure, TaskFlow optionally POSTs a webhook callback with the result or error.
- The admin dashboard reads REST APIs and listens for Socket.io `job:updated` events to show real-time progress.

## Tech Stack

Backend: Node.js, TypeScript, Express, BullMQ, Redis, PostgreSQL, Prisma, Socket.io, Axios.

Frontend: Next.js, React, Tailwind CSS, Socket.io client, Recharts.

## Prerequisites

- Node.js 18+
- Redis
- PostgreSQL
- Docker and Docker Compose for local development

## Step 1 — Clone and Install

```bash
git clone <your-repo-url> taskflow
cd taskflow
npm install
cd dashboard && npm install
```

## Step 2 — Start Redis and PostgreSQL

```bash
docker-compose up -d
```

## Step 3 — Configure Environment

```bash
cp .env.example .env
```

Review the values in `.env` before running migrations.

## Step 4 — Run Migrations

```bash
npx prisma migrate dev
```

## Step 4 — Start the Server

```bash
npm run dev
```

The server starts at `http://localhost:3000` with workers running.

## Step 5 — Access the Dashboard

```bash
cd dashboard
npm run dev
```

Dashboard runs at `http://localhost:3001`.

## How to Test It

1. Use curl or Postman to POST to `/api/jobs`:

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "send_email",
    "payload": { "to": "test@example.com", "subject": "Test", "body": "Hello" },
    "priority": "normal"
  }'
```

2. Use the `jobId` from the response to check status:

```bash
curl http://localhost:3000/api/jobs/{jobId}
```

3. Open the dashboard at `http://localhost:3001` and watch the job progress in real time.

4. Try creating `resize_image` jobs with `"forceFail": true` in the payload to trigger failures and test retry logic.

## Example Webhook Payload

```json
{
  "jobId": "6c2b992d-67e1-4cb5-86db-7687d76d73c2",
  "status": "completed",
  "result": {
    "emailId": "email_6e58d37f-9989-44ff-bd21-f3228839234f",
    "sentAt": "2026-06-10T19:00:00.000Z"
  },
  "error": null
}
```

Failed jobs use `"status": "failed"`, `"result": null`, and an error message.

## Architecture

TaskFlow separates job submission, queueing, execution, persistence, and monitoring:

- API: validates requests, creates jobs, lists jobs, returns job details, and handles cancellation.
- Queue: BullMQ stores job work items in Redis and applies priority ordering.
- Workers: execute registered handlers, enforce timeouts, update PostgreSQL, and schedule retries through BullMQ.
- Storage: PostgreSQL stores job history, status, payloads, results, retry metadata, and logs.
- Dashboard: Next.js reads REST endpoints and listens to Socket.io updates for operational monitoring.

The first deployment runs API and workers in one Node.js process. The queue and database boundaries allow splitting API and workers later.

## Environment Variables

| Variable              | Description                                             | Default                                                  |
| --------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| `REDIS_URL`           | Redis connection URL for BullMQ                         | `redis://localhost:6379`                                 |
| `DATABASE_URL`        | PostgreSQL connection URL for Prisma                    | `postgresql://postgres:postgres@localhost:5434/taskflow` |
| `WORKER_CONCURRENCY`  | Number of concurrent worker jobs in the unified process | `5`                                                      |
| `JOB_TIMEOUT_MS`      | Default per-job timeout in milliseconds                 | `30000`                                                  |
| `MAX_RETRIES`         | Default retry count after the first attempt, max 10     | `3`                                                      |
| `WEBHOOK_TIMEOUT_MS`  | Axios timeout for webhook calls                         | `10000`                                                  |
| `WEBHOOK_MAX_RETRIES` | Maximum webhook delivery attempts                       | `3`                                                      |
| `PORT`                | Backend HTTP port                                       | `3000`                                                   |
| `NODE_ENV`            | Runtime mode                                            | `development`                                            |
| `CORS_ORIGIN`         | Dashboard origin allowed by API and Socket.io           | `http://localhost:3001`                                  |

## API Endpoints

### `POST /api/jobs`

Request:

```json
{
  "taskType": "send_email",
  "payload": {
    "to": "user@example.com",
    "subject": "Hello",
    "body": "Message"
  },
  "callbackUrl": "https://example.com/webhook",
  "priority": "normal",
  "retries": 3,
  "timeout": 30000
}
```

Response:

```json
{
  "jobId": "6c2b992d-67e1-4cb5-86db-7687d76d73c2",
  "status": "pending",
  "createdAt": "2026-06-10T19:00:00.000Z"
}
```

### `GET /api/jobs`

Returns the latest 100 jobs. Optional query parameters: `taskType`, `status`, `from`, `to`.

### `GET /api/jobs/:jobId`

Returns full job status, payload, result, error, retry metadata, and timestamps.

### `GET /api/jobs/:jobId/logs`

Returns job log entries in chronological order.

### `DELETE /api/jobs/:jobId`

Cancels a pending job when BullMQ can remove it and marks pending or active jobs as `cancelled` in PostgreSQL. Completed, failed, and already cancelled jobs return an error.

### `GET /api/stats`

Returns queue counts, success rate, seven-day completion/failure aggregates, active worker count, and uptime.

## Queue and Retry Strategy

BullMQ stores queued work in Redis. TaskFlow maps priorities to BullMQ priority numbers with high priority first, then normal, then low.

Retries use exponential backoff with jitter:

```text
(2 ** attemptNumber) * 1000 + random(0..999)
```

Attempt 1 waits about 2 seconds, attempt 2 about 4 seconds, and attempt 3 about 8 seconds. PostgreSQL records attempt counts and `nextRetryAt` for visibility.

## Known Limitations

- Processing is at-least-once. Handlers must be idempotent if duplicate side effects are unacceptable.
- Jobs that timeout may continue executing internally because JavaScript cannot safely kill arbitrary in-flight async work.
- Active jobs can be marked cancelled, but the current handler may still finish if it does not check cancellation state.
- Webhook delivery failures after final retry are logged but not persisted into a durable webhook retry queue.
- Dashboard socket connection loss is visible through the realtime indicator; REST polling still refreshes every five seconds.
- The first version runs API and workers in one process. Multi-server deployments should split API and workers and add shared event broadcasting.

## Development Commands

```bash
npm run typecheck
npm run build
npm test
cd dashboard && npm run typecheck
cd dashboard && npm run build
```
