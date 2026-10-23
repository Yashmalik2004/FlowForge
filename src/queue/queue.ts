import { Queue } from "bullmq";
import { redisConnectionOptions } from "../lib/redis";

export const TASK_QUEUE_NAME = "flowforge-jobs";

export const priorityToBullPriority = (priority: "low" | "normal" | "high"): number => {
  const priorities = {
    high: 1,
    normal: 5,
    low: 10
  } as const;
  return priorities[priority];
};

export const createTaskQueue = (): Queue => {
  return new Queue(TASK_QUEUE_NAME, {
    connection: redisConnectionOptions
  });
};
