import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { config } from "./config/env";
import { onJobUpdated } from "./events/jobEvents";
import { prisma } from "./lib/db";
import { createJobsRouter } from "./api/jobs";
import { createStatsRouter } from "./api/stats";
import { startWorkers } from "./queue/consumer";

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigin }
});

const worker = startWorkers();

onJobUpdated((event) => {
  io.emit("job:updated", event);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/jobs", createJobsRouter());
app.use("/api/stats", createStatsRouter(() => (worker.isRunning() ? config.workerConcurrency : 0)));

server.listen(config.port, () => {
  console.info(`TaskFlow server running on port ${config.port}`);
});

const shutdown = (): void => {
  server.close(() => {
    worker
      .close()
      .then(() => prisma.$disconnect())
      .finally(() => process.exit(0));
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
