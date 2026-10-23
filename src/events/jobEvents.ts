import { EventEmitter } from "node:events";
import type { JobStatus, JobUpdatedEvent } from "../types";

const emitter = new EventEmitter();
const eventName = "job:updated";

export const emitJobUpdated = (jobId: string, status: JobStatus, progress: number): void => {
  const payload: JobUpdatedEvent = {
    jobId,
    status,
    progress,
    updatedAt: new Date().toISOString()
  };
  emitter.emit(eventName, payload);
};

export const onJobUpdated = (listener: (event: JobUpdatedEvent) => void): (() => void) => {
  emitter.on(eventName, listener);
  return () => {
    emitter.off(eventName, listener);
  };
};

