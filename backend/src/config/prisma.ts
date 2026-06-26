import { PrismaClient } from "@prisma/client";
import { env, isProduction } from "./env";

declare global {
  // Avoid exhausting database connections during local hot reloads.
  var prisma: PrismaClient | undefined;
}

// When using Supabase transaction pooler (pgbouncer), we must disable
// prepared statements. The URL should already contain ?pgbouncer=true
// but we also enforce connection_limit=1 for safety in pooled environments.
const buildDatabaseUrl = () => {
  const url = new URL(env.DATABASE_URL || "");
  url.searchParams.set("pgbouncer", "true");
  url.searchParams.set("connection_limit", "1");
  return url.toString();
};

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["query", "warn", "error"],
    datasources: {
      db: {
        url: env.DATABASE_URL ? buildDatabaseUrl() : undefined
      }
    }
  });

if (!isProduction) {
  global.prisma = prisma;
}

