import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";

declare global {
  // Avoid exhausting database connections during local hot reloads.
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["query", "warn", "error"]
  });

if (!isProduction) {
  global.prisma = prisma;
}
