import { connection } from "next/server";
import { createApiHandler, jsonOk } from "@/server/http/route-handler";
import { getDatabaseStatus } from "@/server/services/database-status-service";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";

/**
 * GET /api/dev/database — development-only database diagnostics.
 *
 * `connection()` opts the handler into request-time rendering; without it the
 * route could be prerendered at build time and freeze a stale status.
 */
export const GET = createApiHandler(async () => {
  await connection();

  if (env.NODE_ENV === "production") {
    throw AppError.notFound("Endpoint");
  }

  return jsonOk(await getDatabaseStatus());
});
