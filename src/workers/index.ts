import { startWorkers } from "../queue/consumer";

const worker = startWorkers();

console.info("TaskFlow worker running");

process.on("SIGINT", () => {
  worker.close().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  worker.close().finally(() => process.exit(0));
});

