import { Router } from "express";
import { prisma } from "../lib/db";
import type { JobInput, JobLogRecord, JobRecord, JobStatus, JsonObject, SerializedJobRecord } from "../types";
import { enqueueJob as defaultEnqueueJob } from "../queue/producer";
import { createTaskQueue } from "../queue/queue";
import { emitJobUpdated } from "../events/jobEvents";

interface JobsDependencies {
  enqueueJob: (input: JobInput) => Promise<{ jobId: string; status: "pending"; createdAt: Date }>;
  listJobs: (filters: JobListFilters) => Promise<JobRecord[]>;
  getJob: (jobId: string) => Promise<JobRecord | null>;
  getJobLogs: (jobId: string) => Promise<JobLogRecord[]>;
  cancelJob: (jobId: string) => Promise<{ success: true } | { success: false; error: string }>;
}

export interface JobListFilters {
  taskType?: string;
  status?: JobStatus;
  from?: Date;
  to?: Date;
}

const jobStatuses = new Set<JobStatus>(["pending", "active", "completed", "failed", "cancelled"]);
const priorities = new Set(["low", "normal", "high"]);

export const serializeJob = (job: JobRecord): SerializedJobRecord => ({
  ...job,
  createdAt: job.createdAt.toISOString(),
  startedAt: job.startedAt?.toISOString() ?? null,
  completedAt: job.completedAt?.toISOString() ?? null,
  nextRetryAt: job.nextRetryAt?.toISOString() ?? null
});

const isJsonObject = (value: unknown): value is JsonObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseJobInput = (body: unknown): JobInput => {
  if (!isJsonObject(body)) {
    throw new Error("request body must be an object");
  }
  const taskType = body.taskType;
  if (typeof taskType !== "string" || taskType.trim() === "") {
    throw new Error("taskType is required");
  }
  const payload = body.payload;
  if (!isJsonObject(payload)) {
    throw new Error("payload must be an object");
  }
  const priority = body.priority;
  if (priority !== undefined && (typeof priority !== "string" || !priorities.has(priority))) {
    throw new Error("priority must be low, normal, or high");
  }
  const retries = body.retries;
  if (retries !== undefined && (typeof retries !== "number" || !Number.isInteger(retries) || retries < 0 || retries > 10)) {
    throw new Error("retries must be between 0 and 10");
  }
  const timeout = body.timeout;
  if (timeout !== undefined && (typeof timeout !== "number" || !Number.isInteger(timeout) || timeout < 1000)) {
    throw new Error("timeout must be at least 1000");
  }
  const callbackUrl = body.callbackUrl;
  if (callbackUrl !== undefined && typeof callbackUrl !== "string") {
    throw new Error("callbackUrl must be a valid URL");
  }

  const input: JobInput = { taskType, payload };
  if (typeof callbackUrl === "string") {
    input.callbackUrl = callbackUrl;
  }
  if (priority === "low" || priority === "normal" || priority === "high") {
    input.priority = priority;
  }
  if (typeof retries === "number") {
    input.retries = retries;
  }
  if (typeof timeout === "number") {
    input.timeout = timeout;
  }
  return input;
};

const toJobRecord = (job: Awaited<ReturnType<typeof prisma.job.findUnique>>): JobRecord | null => {
  if (job === null) {
    return null;
  }
  return {
    jobId: job.jobId,
    taskType: job.taskType,
    status: job.status as JobStatus,
    progress: job.progress,
    payload: job.payload,
    result: job.result,
    error: job.error,
    priority: job.priority as JobRecord["priority"],
    attempts: job.attempts,
    maxRetries: job.maxRetries,
    callbackUrl: job.callbackUrl,
    timeout: job.timeout,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    nextRetryAt: job.nextRetryAt
  };
};

export const listJobs = async (filters: JobListFilters): Promise<JobRecord[]> => {
  const jobs = await prisma.job.findMany({
    where: {
      ...(filters.taskType !== undefined ? { taskType: filters.taskType } : {}),
      ...(filters.status !== undefined ? { status: filters.status } : {}),
      ...(filters.from !== undefined || filters.to !== undefined
        ? { createdAt: { ...(filters.from !== undefined ? { gte: filters.from } : {}), ...(filters.to !== undefined ? { lte: filters.to } : {}) } }
        : {})
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return jobs.map((job) => toJobRecord(job)).filter((job): job is JobRecord => job !== null);
};

export const getJob = async (jobId: string): Promise<JobRecord | null> => {
  return toJobRecord(await prisma.job.findUnique({ where: { jobId } }));
};

export const getJobLogs = async (jobId: string): Promise<JobLogRecord[]> => {
  return prisma.jobLog.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } });
};

export const cancelJob = async (jobId: string): Promise<{ success: true } | { success: false; error: string }> => {
  const job = await prisma.job.findUnique({ where: { jobId } });
  if (job === null) {
    return { success: false, error: "Job not found" };
  }
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return { success: false, error: "Job cannot be cancelled" };
  }

  const queue = createTaskQueue();
  try {
    const queueJob = await queue.getJob(jobId);
    if (queueJob !== undefined && queueJob !== null) {
      await queueJob.remove().catch(() => undefined);
    }
  } finally {
    await queue.close();
  }

  await prisma.job.update({ where: { jobId }, data: { status: "cancelled", completedAt: new Date() } });
  emitJobUpdated(jobId, "cancelled", job.progress);
  return { success: true };
};

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const createJobsRouter = (
  deps: JobsDependencies = {
    enqueueJob: defaultEnqueueJob,
    listJobs,
    getJob,
    getJobLogs,
    cancelJob
  }
): Router => {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const input = parseJobInput(req.body);
      const created = await deps.enqueueJob(input);
      res.status(201).json({ ...created, createdAt: created.createdAt.toISOString() });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid request";
      res.status(400).json({ error: message });
    }
  });

  router.get("/", async (req, res) => {
    const status = typeof req.query.status === "string" && jobStatuses.has(req.query.status as JobStatus) ? (req.query.status as JobStatus) : undefined;
    const taskType = typeof req.query.taskType === "string" && req.query.taskType.trim() !== "" ? req.query.taskType : undefined;
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const filters: JobListFilters = {};
    if (taskType !== undefined) {
      filters.taskType = taskType;
    }
    if (status !== undefined) {
      filters.status = status;
    }
    if (from !== undefined) {
      filters.from = from;
    }
    if (to !== undefined) {
      filters.to = to;
    }
    const jobs = await deps.listJobs(filters);
    res.json({ jobs: jobs.map(serializeJob) });
  });

  router.get("/:jobId/logs", async (req, res) => {
    const logs = await deps.getJobLogs(req.params.jobId);
    res.json({ logs: logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() })) });
  });

  router.get("/:jobId", async (req, res) => {
    const job = await deps.getJob(req.params.jobId);
    if (job === null) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(serializeJob(job));
  });

  router.delete("/:jobId", async (req, res) => {
    const result = await deps.cancelJob(req.params.jobId);
    if (!result.success) {
      res.status(result.error === "Job not found" ? 404 : 409).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  });

  return router;
};
