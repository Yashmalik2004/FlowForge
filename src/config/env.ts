import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  redisUrl: string;
  databaseUrl: string;
  workerConcurrency: number;
  jobTimeoutMs: number;
  maxRetries: number;
  webhookTimeoutMs: number;
  webhookMaxRetries: number;
  port: number;
  nodeEnv: NodeEnvironment;
  corsOrigin: string;
}

type EnvSource = Record<string, string | undefined>;

const readRequired = (env: EnvSource, key: string): string => {
  const value = env[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required`);
  }
  return value;
};

const readInt = (env: EnvSource, key: string, minimum: number, maximum: number): number => {
  const raw = readRequired(env, key);
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be between ${minimum} and ${maximum}`);
  }
  return value;
};

const readUrl = (env: EnvSource, key: string): string => {
  const raw = readRequired(env, key);
  try {
    return new URL(raw).toString();
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
};

const readNodeEnv = (env: EnvSource): NodeEnvironment => {
  const raw = env.NODE_ENV ?? "development";
  if (raw === "development" || raw === "test" || raw === "production") {
    return raw;
  }
  throw new Error("NODE_ENV must be development, test, or production");
};

export const parseEnv = (env: EnvSource): AppConfig => ({
  redisUrl: readUrl(env, "REDIS_URL"),
  databaseUrl: readRequired(env, "DATABASE_URL"),
  workerConcurrency: readInt(env, "WORKER_CONCURRENCY", 1, 100),
  jobTimeoutMs: readInt(env, "JOB_TIMEOUT_MS", 1_000, 3_600_000),
  maxRetries: readInt(env, "MAX_RETRIES", 0, 10),
  webhookTimeoutMs: readInt(env, "WEBHOOK_TIMEOUT_MS", 1_000, 300_000),
  webhookMaxRetries: readInt(env, "WEBHOOK_MAX_RETRIES", 0, 10),
  port: readInt(env, "PORT", 1, 65_535),
  nodeEnv: readNodeEnv(env),
  corsOrigin: env.CORS_ORIGIN ?? "http://localhost:3001"
});

export const config = parseEnv(process.env);

