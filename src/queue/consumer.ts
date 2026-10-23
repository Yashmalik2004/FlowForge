import { Worker } from "bullmq";
import { config } from "../config/env";
import { emitJobUpdated } from "../events/jobEvents";
import { prisma } from "../lib/db";
import { redisConnectionOptions } from "../lib/redis";
import type { JsonObject, JsonValue, TaskContext, WebhookPayload } from "../types";
import type { Prisma } from "@prisma/client";
import { deliverWebhook } from "../webhooks/delivery";
import { getHandler } from "../workers/handlers";
import { calculateRetryDelay } from "../workers/retry";
import { TASK_QUEUE_NAME } from "./queue";

interface QueueJobData {
  jobId: string;
}

const asQueueJobData = (value: unknown): QueueJobData => {
  if (typeof value === "object" && value !== null && "jobId" in value) {
    const jobId = (value as { jobId: unknown }).jobId;
    if (typeof jobId === "string") {
      return { jobId };
    }
  }
  throw new Error("Invalid queue job data");
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Job timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
};

const scheduleWebhook = (callbackUrl: string | null, payload: WebhookPayload): void => {
  if (callbackUrl === null) {
    return;
  }
  deliverWebhook(callbackUrl, payload).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected webhook scheduling failure for job ${payload.jobId}: ${message}`);
  });
};

export const startWorkers = (): Worker => {
  return new Worker<QueueJobData>(
    TASK_QUEUE_NAME,
    async (queueJob) => {
      const { jobId } = asQueueJobData(queueJob.data);
      const dbJob = await prisma.job.findUnique({ where: { jobId } });
      if (dbJob === null) {
        throw new Error(`Job ${jobId} not found`);
      }
      if (dbJob.status === "cancelled") {
        await prisma.jobLog.create({ data: { jobId, level: "warn", message: "Cancelled job skipped by worker" } });
        return;
      }

      const attempt = queueJob.attemptsMade + 1;
      await prisma.job.update({
        where: { jobId },
        data: { status: "active", startedAt: new Date(), attempts: attempt, progress: 0, nextRetryAt: null }
      });
      emitJobUpdated(jobId, "active", 0);

      const context: TaskContext = {
        jobId,
        taskType: dbJob.taskType,
        attempt,
        updateProgress: async (progress) => {
          const clamped = Math.max(0, Math.min(100, Math.round(progress)));
          await prisma.job.update({ where: { jobId }, data: { progress: clamped } });
          emitJobUpdated(jobId, "active", clamped);
        },
        log: async (message, level = "info") => {
          await prisma.jobLog.create({ data: { jobId, message, level } });
        }
      };

      const handler = getHandler(dbJob.taskType);
      if (handler === undefined) {
        throw new Error(`Unknown taskType: ${dbJob.taskType}`);
      }

      const result = await withTimeout(handler(dbJob.payload as JsonObject, context), dbJob.timeout);
      await prisma.job.update({
        where: { jobId },
        data: { status: "completed", result: result as Prisma.InputJsonValue, progress: 100, completedAt: new Date(), error: null }
      });
      await context.log("Job completed");
      emitJobUpdated(jobId, "completed", 100);
      scheduleWebhook(dbJob.callbackUrl, { jobId, status: "completed", result, error: null });
    },
    {
      connection: redisConnectionOptions,
      concurrency: config.workerConcurrency,
      settings: {
        backoffStrategy: (_attemptsMade, _type, _err, job) => calculateRetryDelay(job?.attemptsMade ?? 1)
      }
    }
  )
    .on("failed", async (job, error) => {
      if (job === undefined) {
        console.error(`Worker failed without job context: ${error.message}`);
        return;
      }
      const { jobId } = asQueueJobData(job.data);
      const dbJob = await prisma.job.findUnique({ where: { jobId } });
      if (dbJob === null || dbJob.status === "cancelled") {
        return;
      }
      const finalFailure = job.attemptsMade >= (job.opts.attempts ?? 1);
      const nextRetryAt = finalFailure ? null : new Date(Date.now() + calculateRetryDelay(job.attemptsMade));
      await prisma.job.update({
        where: { jobId },
        data: {
          status: finalFailure ? "failed" : "pending",
          error: error.message,
          attempts: job.attemptsMade,
          completedAt: finalFailure ? new Date() : null,
          nextRetryAt
        }
      });
      await prisma.jobLog.create({ data: { jobId, level: "error", message: error.message } });
      emitJobUpdated(jobId, finalFailure ? "failed" : "pending", dbJob.progress);
      if (finalFailure) {
        scheduleWebhook(dbJob.callbackUrl, { jobId, status: "failed", result: null, error: error.message });
      }
    })
    .on("error", (error) => {
      console.error(`Worker error: ${error.message}`);
    });
};
