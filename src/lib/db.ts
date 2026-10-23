import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var taskflowPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.taskflowPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.taskflowPrisma = prisma;
}

