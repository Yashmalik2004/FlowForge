import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const validEnv = {
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
};

describe("parseEnv", () => {
  it("parses valid environment values", () => {
    const parsed = parseEnv(validEnv);

    expect(parsed.port).toBe(3000);
    expect(parsed.workerConcurrency).toBe(5);
    expect(parsed.maxRetries).toBe(3);
    expect(parsed.nodeEnv).toBe("test");
  });

  it("fails when required values are missing", () => {
    const { REDIS_URL: _redacted, ...missingRedis } = validEnv;

    expect(() => parseEnv(missingRedis)).toThrow("REDIS_URL is required");
  });

  it("enforces retry bounds", () => {
    expect(() => parseEnv({ ...validEnv, MAX_RETRIES: "11" })).toThrow("MAX_RETRIES must be between 0 and 10");
  });
});
