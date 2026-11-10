/**
 * Shared Prisma client.
 *
 * Prisma 7 runs on the WASM query compiler + `@prisma/adapter-pg`, so there is
 * no native engine binary to load. The instance is cached on `globalThis` in
 * development to survive hot reloads instead of exhausting connections.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

type PrismaGlobal = typeof globalThis & { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set when REPOSITORY_MODE=database.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Lazily create the client so importing this module never opens a pool —
 * important when the app runs in `memory` repository mode.
 */
export function getPrisma(): PrismaClient {
  const store = globalThis as PrismaGlobal;
  const client = store.prisma ?? createPrismaClient();
  if (env.NODE_ENV !== "production") {
    store.prisma = client;
  }
  return client;
}
