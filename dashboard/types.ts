export type JobStatus = "pending" | "active" | "completed" | "failed" | "cancelled";

export interface JobRecord {
  jobId: string;
  taskType: string;
  status: JobStatus;
  progress: number;
  payload: unknown;
  result: unknown;
  error: string | null;
  priority: "low" | "normal" | "high";
  attempts: number;
  maxRetries: number;
  callbackUrl: string | null;
  timeout: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  nextRetryAt: string | null;
}

export interface JobLog {
  id: string;
  jobId: string;
  message: string;
  level: "info" | "warn" | "error";
  createdAt: string;
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

export interface JobUpdatedEvent {
  jobId: string;
  status: JobStatus;
  progress: number;
  updatedAt: string;
}
