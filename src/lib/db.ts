import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var flowforgePrisma: PrismaClient | undefined;
}

export const prisma = globalThis.flowforgePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.flowforgePrisma = prisma;
}

