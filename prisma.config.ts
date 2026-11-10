import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer loads .env files automatically. Load it here so every
// CLI command (migrate, seed, studio) sees the same configuration as Next.js.
process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
