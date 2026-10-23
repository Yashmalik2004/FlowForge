import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createJobsRouter } from "./jobs";
import type { JobRecord, JobStatus } from "../types";

const createRecord = (status: JobStatus): JobRecord => ({
  jobId: "job-1",
  taskType: "send_email",
  status,
  progress: 0,
  payload: { to: "user@example.com" },
  result: null,
  error: null,
  priority: "normal",
  attempts: 0,
  maxRetries: 3,
  callbackUrl: null,
  timeout: 30000,
  createdAt: new Date("2026-06-10T10:00:00.000Z"),
  startedAt: null,
  completedAt: null,
  nextRetryAt: null
});

describe("jobs router", () => {
  it("rejects invalid job submissions", async () => {
    const app = express();
    app.use(express.json());
    app.use(
      "/api/jobs",
      createJobsRouter({
        enqueueJob: vi.fn(),
        listJobs: vi.fn(),
        getJob: vi.fn(),
        getJobLogs: vi.fn(),
        cancelJob: vi.fn()
      })
    );

    const response = await request(app).post("/api/jobs").send({ payload: {} });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "taskType is required" });
  });

  it("returns created job response after enqueue", async () => {
    const app = express();
    const createdAt = new Date("2026-06-10T10:00:00.000Z");
    app.use(express.json());
    app.use(
      "/api/jobs",
      createJobsRouter({
        enqueueJob: vi.fn().mockResolvedValue({ jobId: "job-1", status: "pending", createdAt }),
        listJobs: vi.fn(),
        getJob: vi.fn(),
        getJobLogs: vi.fn(),
        cancelJob: vi.fn()
      })
    );

    const response = await request(app)
      .post("/api/jobs")
      .send({ taskType: "send_email", payload: { to: "user@example.com" } });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ jobId: "job-1", status: "pending", createdAt: createdAt.toISOString() });
  });

  it("returns 404 for a missing job", async () => {
    const app = express();
    app.use(express.json());
    app.use(
      "/api/jobs",
      createJobsRouter({
        enqueueJob: vi.fn(),
        listJobs: vi.fn(),
        getJob: vi.fn().mockResolvedValue(null),
        getJobLogs: vi.fn(),
        cancelJob: vi.fn()
      })
    );

    const response = await request(app).get("/api/jobs/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Job not found" });
  });

  it("rejects cancellation for completed jobs", async () => {
    const app = express();
    app.use(express.json());
    app.use(
      "/api/jobs",
      createJobsRouter({
        enqueueJob: vi.fn(),
        listJobs: vi.fn(),
        getJob: vi.fn().mockResolvedValue(createRecord("completed")),
        getJobLogs: vi.fn(),
        cancelJob: vi.fn().mockResolvedValue({ success: false, error: "Job cannot be cancelled" })
      })
    );

    const response = await request(app).delete("/api/jobs/job-1");

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Job cannot be cancelled" });
  });
});
