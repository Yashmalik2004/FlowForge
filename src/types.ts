import type { JobLog, Prisma } from "@prisma/client";

export type JsonValue = Prisma.JsonValue;
export type JsonObject = Prisma.JsonObject;

export type JobPriority = "low" | "normal" | "high";
export type JobStatus = "pending" | "active" | "completed" | "failed" | "cancelled";
export type LogLevel = "info" | "warn" | "error";

export interface JobInput {
  taskType: string;
  payload: JsonObject;
  callbackUrl?: string;
  priority?: JobPriority;
  retries?: number;
  timeout?: number;
}

export interface NormalizedJobInput {
  taskType: string;
  payload: JsonObject;
  callbackUrl: string | null;
  priority: JobPriority;
  retries: number;
  timeout: number;
}

export interface JobRecord {
  jobId: string;
  taskType: string;
  status: JobStatus;
  progress: number;
  payload: JsonValue;
  result: JsonValue | null;
  error: string | null;
  priority: JobPriority;
  attempts: number;
  maxRetries: number;
  callbackUrl: string | null;
  timeout: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  nextRetryAt: Date | null;
}

export interface SerializedJobRecord extends Omit<JobRecord, "createdAt" | "startedAt" | "completedAt" | "nextRetryAt"> {
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  nextRetryAt: string | null;
}

export interface TaskContext {
  jobId: string;
  taskType: string;
  attempt: number;
  updateProgress: (progress: number) => Promise<void>;
  log: (message: string, level?: LogLevel) => Promise<void>;
}

export interface TaskHandler {
  (payload: JsonObject, context: TaskContext): Promise<JsonObject>;
}

export interface WebhookPayload {
  jobId: string;
  status: "completed" | "failed";
  result: JsonValue | null;
  error: string | null;
}

export interface JobUpdatedEvent {
  jobId: string;
  status: JobStatus;
  progress: number;
  updatedAt: string;
}

export interface StatsDay {
  date: string;
  completed: number;
  failed: number;
}

export interface StatsResponse {
  queued: number;
  active: number;
  completed: number;
  failed: number;
  successRate: number;
  lastSevenDays: StatsDay[];
  activeWorkers: number;
  uptimeSeconds: number;
}

export type JobLogRecord = Pick<JobLog, "id" | "jobId" | "message" | "level" | "createdAt">;
