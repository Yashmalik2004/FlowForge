import { randomUUID } from "node:crypto";
import { config } from "../config/env";
import { emitJobUpdated } from "../events/jobEvents";
import { prisma } from "../lib/db";
import type { JobInput, JobPriority, NormalizedJobInput } from "../types";
import { createTaskQueue, priorityToBullPriority } from "./queue";

export interface EnqueueResult {
  jobId: string;
  status: "pending";
  createdAt: Date;
}

export const normalizeJobInput = (input: JobInput): NormalizedJobInput => {
  const priority: JobPriority = input.priority ?? "normal";
  const retries = input.retries ?? config.maxRetries;
  const timeout = input.timeout ?? config.jobTimeoutMs;

  if (input.taskType.trim() === "") {
    throw new Error("taskType is required");
  }
  if (retries < 0 || retries > 10 || !Number.isInteger(retries)) {
    throw new Error("retries must be between 0 and 10");
  }
  if (timeout < 1000 || !Number.isInteger(timeout)) {
    throw new Error("timeout must be at least 1000");
  }
  if (input.callbackUrl !== undefined) {
    try {
      new URL(input.callbackUrl);
    } catch {
      throw new Error("callbackUrl must be a valid URL");
    }
  }

  return {
    taskType: input.taskType,
    payload: input.payload,
    callbackUrl: input.callbackUrl ?? null,
    priority,
    retries,
    timeout
  };
};

export const enqueueJob = async (input: JobInput): Promise<EnqueueResult> => {
  const normalized = normalizeJobInput(input);
  const jobId = randomUUID();
  const queue = createTaskQueue();

  const record = await prisma.job.create({
    data: {
      jobId,
      taskType: normalized.taskType,
      payload: normalized.payload,
      status: "pending",
      priority: normalized.priority,
      maxRetries: normalized.retries,
      callbackUrl: normalized.callbackUrl,
      timeout: normalized.timeout
    }
  });

  try {
    await queue.add(
      normalized.taskType,
      { jobId },
      {
        jobId,
        priority: priorityToBullPriority(normalized.priority),
        attempts: normalized.retries + 1,
        removeOnComplete: false,
        removeOnFail: false
      }
    );
    emitJobUpdated(jobId, "pending", 0);
    return { jobId, status: "pending", createdAt: record.createdAt };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.job.update({
      where: { jobId },
      data: {
        status: "failed",
        error: `Failed to enqueue job: ${message}`,
        completedAt: new Date()
      }
    });
    throw error;
  } finally {
    await queue.close();
  }
};

