/**
 * Database status service.
 *
 * Powers the development status screen and `GET /api/dev/database`. It reports
 * connectivity, latency, row counts and migration history without leaking the
 * connection string.
 */

import { env } from "@/lib/env";
import { getPrisma } from "@/server/db/prisma";

export type MigrationRecord = {
  migrationName: string;
  startedAt: string | null;
  finishedAt: string | null;
  rolledBackAt: string | null;
};

export type DatabaseStatus = {
  connected: boolean;
  latencyMs: number | null;
  productCount: number | null;
  migrations: MigrationRecord[];
  pendingMigrations: number;
  serverVersion: string | null;
  databaseName: string | null;
  repositoryMode: string;
  error: string | null;
};

function redact(connectionString?: string): string | null {
  if (!connectionString) return null;
  try {
    const url = new URL(connectionString);
    return `${url.host}${url.pathname}`;
  } catch {
    return null;
  }
}

export const databaseTarget = redact(env.DATABASE_URL);

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const base: DatabaseStatus = {
    connected: false,
    latencyMs: null,
    productCount: null,
    migrations: [],
    pendingMigrations: 0,
    serverVersion: null,
    databaseName: null,
    repositoryMode: env.REPOSITORY_MODE,
    error: null,
  };

  if (env.REPOSITORY_MODE !== "database") {
    return { ...base, error: "REPOSITORY_MODE is 'memory' — no database is in use." };
  }

  const startedAt = performance.now();

  try {
    const prisma = getPrisma();

    const info = await prisma.$queryRaw<{ version: string; database: string }[]>`
      SELECT version() AS version, current_database() AS database
    `;

    const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const productCount = await prisma.product.count();

    let migrations: MigrationRecord[] = [];
    try {
      migrations = await prisma.$queryRaw<MigrationRecord[]>`
        SELECT migration_name AS "migrationName",
               started_at::text AS "startedAt",
               finished_at::text AS "finishedAt",
               rolled_back_at::text AS "rolledBackAt"
        FROM _prisma_migrations
        ORDER BY started_at DESC
      `;
    } catch {
      // Table is absent until the first migration runs.
    }

    return {
      ...base,
      connected: true,
      latencyMs,
      productCount,
      migrations,
      pendingMigrations: migrations.filter((m) => !m.finishedAt || m.rolledBackAt).length,
      serverVersion: info[0]?.version?.split(",")[0] ?? null,
      databaseName: info[0]?.database ?? null,
    };
  } catch (error) {
    return {
      ...base,
      latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
