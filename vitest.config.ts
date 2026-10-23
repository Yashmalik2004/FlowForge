import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      REDIS_URL: "redis://localhost:6379",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/taskflow",
      WORKER_CONCURRENCY: "5",
      JOB_TIMEOUT_MS: "30000",
      MAX_RETRIES: "3",
      WEBHOOK_TIMEOUT_MS: "10000",
      WEBHOOK_MAX_RETRIES: "3",
      PORT: "3000",
      NODE_ENV: "test",
      CORS_ORIGIN: "http://localhost:3001"
    },
    globals: true,
    restoreMocks: true
  }
});
