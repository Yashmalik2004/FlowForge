"use client";

import { io, type Socket } from "socket.io-client";
import type { JobUpdatedEvent } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const createDashboardSocket = (): Socket<{ "job:updated": (event: JobUpdatedEvent) => void }> => {
  return io(API_BASE_URL, {
    transports: ["websocket", "polling"]
  });
};

