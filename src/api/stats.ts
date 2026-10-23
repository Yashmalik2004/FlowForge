import { Router } from "express";
import { prisma } from "../lib/db";
import type { StatsDay, StatsResponse } from "../types";

const startTime = Date.now();

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const getStats = async (activeWorkers: number): Promise<StatsResponse> => {
  const [queued, active, completed, failed] = await Promise.all([
    prisma.job.count({ where: { status: "pending" } }),
    prisma.job.count({ where: { status: "active" } }),
    prisma.job.count({ where: { status: "completed" } }),
    prisma.job.count({ where: { status: "failed" } })
  ]);

  const days: StatsDay[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const [dayCompleted, dayFailed] = await Promise.all([
      prisma.job.count({ where: { status: "completed", completedAt: { gte: start, lt: end } } }),
      prisma.job.count({ where: { status: "failed", completedAt: { gte: start, lt: end } } })
    ]);
    days.push({ date: isoDate(start), completed: dayCompleted, failed: dayFailed });
  }

  return {
    queued,
    active,
    completed,
    failed,
    successRate: completed + failed === 0 ? 0 : completed / (completed + failed),
    lastSevenDays: days,
    activeWorkers,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
  };
};

export const createStatsRouter = (activeWorkers: () => number): Router => {
  const router = Router();
  router.get("/", async (_req, res) => {
    res.json(await getStats(activeWorkers()));
  });
  return router;
};

