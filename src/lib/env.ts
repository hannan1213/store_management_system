/**
 * Environment configuration.
 *
 * Server-only. All configuration is parsed and validated once at startup —
 * a missing or malformed value fails fast with a clear message instead of
 * surfacing deep inside a request. Import `env` anywhere in server code.
 */

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_NAME: z.string().min(1).default("GOS Store"),
    /**
     * `memory` keeps seeded demo data in process memory (no infra needed);
     * `database` uses PostgreSQL through Prisma and requires DATABASE_URL.
     */
    REPOSITORY_MODE: z.enum(["memory", "database"]).default("database"),
    DATABASE_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.REPOSITORY_MODE === "database" && !value.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when REPOSITORY_MODE is 'database'.",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const summary = parsed.error.issues
    .map((issue) => `  - env.${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${summary}`);
}

export const env = parsed.data;
